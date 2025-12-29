require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const axios = require('axios');
const express = require('express');

// Create a new client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites, // Required for invite tracking
    ]
});

// Cache for tracking invites
const inviteCache = new Map();

// Helper function to cache invites for a guild
async function cacheGuildInvites(guild) {
    try {
        const invites = await guild.invites.fetch();
        const inviteMap = new Map();
        invites.forEach(invite => {
            inviteMap.set(invite.code, invite.uses);
        });
        inviteCache.set(guild.id, inviteMap);
    } catch (error) {
        console.error(`Failed to cache invites for ${guild.name}:`, error.message);
    }
}

// Helper function to send data to n8n webhook
async function sendToWebhook(eventType, data) {
    if (!process.env.WEBHOOK_URL) {
        console.log('⚠️ No webhook URL configured');
        return;
    }

    try {
        const payload = {
            event: eventType,
            timestamp: new Date().toISOString(),
            data: data
        };

        await axios.post(process.env.WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Webhook sent for event: ${eventType}`);
    } catch (error) {
        console.error(`❌ Failed to send webhook for ${eventType}:`, error.message);
    }
}

// When the bot is ready
client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Bot is ready! Logged in as ${c.user.tag}`);
    
    // Cache invites for all guilds on startup
    for (const guild of c.guilds.cache.values()) {
        await cacheGuildInvites(guild);
    }
    console.log('📋 Cached invites for all servers');
    
    sendToWebhook('bot_ready', {
        botTag: c.user.tag,
        botId: c.user.id,
        serverCount: c.guilds.cache.size
    });
});

// When a new member joins the server
client.on(Events.GuildMemberAdd, async (member) => {
    console.log(`👋 New member joined: ${member.user.tag}`);
    
    // Track which invite was used
    let inviteUsed = null;
    let inviter = null;
    let joinMethod = 'unknown';
    
    try {
        // Fetch current invites
        const newInvites = await member.guild.invites.fetch();
        const oldInvites = inviteCache.get(member.guild.id) || new Map();
        
        // Find which invite was used by comparing uses
        let usedInvite = null;
        for (const [code, invite] of newInvites.entries()) {
            const oldUses = oldInvites.get(code) || 0;
            if (invite.uses > oldUses) {
                usedInvite = invite;
                joinMethod = 'invite';
                break;
            }
        }
        
        if (usedInvite) {
            inviteUsed = {
                code: usedInvite.code,
                uses: usedInvite.uses,
                maxUses: usedInvite.maxUses || 'unlimited',
                channelId: usedInvite.channel?.id,
                channelName: usedInvite.channel?.name,
                temporary: usedInvite.temporary,
                expiresAt: usedInvite.expiresAt
            };
            
            if (usedInvite.inviter) {
                inviter = {
                    id: usedInvite.inviter.id,
                    tag: usedInvite.inviter.tag,
                    username: usedInvite.inviter.username
                };
            }
            
            console.log(`📨 Member joined via invite ${usedInvite.code} created by ${usedInvite.inviter?.tag || 'Unknown'}`);
        } else {
            // Could be vanity URL, server discovery, or other method
            if (member.guild.vanityURLCode) {
                joinMethod = 'vanity_url';
            } else {
                joinMethod = 'discovery_or_other';
            }
        }
        
        // Update cache with new invite uses
        await cacheGuildInvites(member.guild);
        
    } catch (error) {
        console.error('Failed to track invite:', error.message);
        joinMethod = 'error_tracking';
    }
    
    // Send to webhook
    await sendToWebhook('guild_member_add', {
        userId: member.user.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        tag: member.user.tag,
        avatar: member.user.displayAvatarURL(),
        isBot: member.user.bot,
        guildId: member.guild.id,
        guildName: member.guild.name,
        joinedAt: member.joinedAt,
        accountCreatedAt: member.user.createdAt,
        joinMethod: joinMethod, // 'invite', 'vanity_url', 'discovery_or_other', 'unknown', 'error_tracking'
        inviteUsed: inviteUsed, // Invite details (if joined via invite)
        inviter: inviter // Who created the invite (if available)
    });
    
    // Example: Send a welcome message to a specific channel
    /*
    const welcomeChannel = member.guild.channels.cache.find(
        ch => ch.name === 'welcome' || ch.name === 'general'
    );
    
    if (welcomeChannel) {
        welcomeChannel.send(`Welcome to the server, ${member}! 🎉`);
    }
    */
});

// When a member leaves the server
client.on(Events.GuildMemberRemove, async (member) => {
    console.log(`👋 Member left: ${member.user.tag}`);
    
    // Check audit logs to determine if kicked or banned
    let removalType = 'left'; // Default to voluntary leave
    let executor = null;
    let reason = null;
    
    try {
        // Fetch recent audit log entries
        const auditLogs = await member.guild.fetchAuditLogs({
            limit: 5,
            type: null // Get all types
        });
        
        // Look for kicks or bans that match this user
        const kickLog = auditLogs.entries.find(entry => 
            entry.action === 20 && // MEMBER_KICK
            entry.target.id === member.user.id &&
            Date.now() - entry.createdTimestamp < 5000 // Within last 5 seconds
        );
        
        const banLog = auditLogs.entries.find(entry => 
            entry.action === 22 && // MEMBER_BAN_ADD
            entry.target.id === member.user.id &&
            Date.now() - entry.createdTimestamp < 5000
        );
        
        if (banLog) {
            removalType = 'banned';
            executor = {
                id: banLog.executor.id,
                tag: banLog.executor.tag
            };
            reason = banLog.reason;
        } else if (kickLog) {
            removalType = 'kicked';
            executor = {
                id: kickLog.executor.id,
                tag: kickLog.executor.tag
            };
            reason = kickLog.reason;
        }
    } catch (error) {
        console.error('Failed to fetch audit logs:', error.message);
    }
    
    console.log(`${member.user.tag} ${removalType} from ${member.guild.name}`);
    
    // Send to webhook
    await sendToWebhook('guild_member_remove', {
        userId: member.user.id,
        username: member.user.username,
        tag: member.user.tag,
        guildId: member.guild.id,
        guildName: member.guild.name,
        removalType: removalType, // 'left', 'kicked', or 'banned'
        executor: executor, // Who performed the action (null if voluntary)
        reason: reason, // Reason provided (if any)
        roles: member.roles.cache.map(role => ({
            id: role.id,
            name: role.name
        })),
        joinedAt: member.joinedAt,
        leftAt: new Date().toISOString()
    });
    
    // Example: Log to a specific channel
    /*
    const logChannel = member.guild.channels.cache.find(
        ch => ch.name === 'logs'
    );

    if (logChannel) {
        let message = `${member.user.tag} has left the server.`;
        if (removalType === 'kicked') {
            message = `${member.user.tag} was kicked by ${executor.tag}. Reason: ${reason || 'No reason provided'}`;
        } else if (removalType === 'banned') {
            message = `${member.user.tag} was banned by ${executor.tag}. Reason: ${reason || 'No reason provided'}`;
        }
        logChannel.send(message);
    }
    */
});

// When a member updates (role changes, nickname changes, etc.)
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    console.log(`🔄 Member updated: ${newMember.user.tag}`);
    
    // Check for role changes
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    
    const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
    
    if (addedRoles.size > 0) {
        console.log(`Added roles: ${addedRoles.map(r => r.name).join(', ')}`);
    }
    
    if (removedRoles.size > 0) {
        console.log(`Removed roles: ${removedRoles.map(r => r.name).join(', ')}`);
    }
    
    // Send to webhook
    await sendToWebhook('guild_member_update', {
        userId: newMember.user.id,
        username: newMember.user.username,
        tag: newMember.user.tag,
        guildId: newMember.guild.id,
        guildName: newMember.guild.name,
        changes: {
            nickname: {
                old: oldMember.nickname,
                new: newMember.nickname
            },
            roles: {
                added: addedRoles.map(role => ({
                    id: role.id,
                    name: role.name
                })),
                removed: removedRoles.map(role => ({
                    id: role.id,
                    name: role.name
                }))
            }
        }
    });
});

// When a message is sent
client.on(Events.MessageCreate, async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    console.log(`💬 Message from ${message.author.tag}: ${message.content}`);
    
    // Send to webhook (be careful with this - can generate a lot of events!)
    // Uncomment if you want ALL messages sent to webhook
    /*
    await sendToWebhook('message_create', {
        messageId: message.id,
        content: message.content,
        authorId: message.author.id,
        authorTag: message.author.tag,
        channelId: message.channel.id,
        channelName: message.channel.name,
        guildId: message.guild?.id,
        guildName: message.guild?.name,
        attachments: message.attachments.map(att => ({
            id: att.id,
            name: att.name,
            url: att.url
        })),
        createdAt: message.createdAt
    });
    */
    
    // Example: Simple ping command
    if (message.content === '!ping') {
        message.reply('Pong! 🏓');
    }
});

// Error handling
client.on(Events.Error, (error) => {
    console.error('❌ Client error:', error);
    
    sendToWebhook('client_error', {
        error: error.message,
        stack: error.stack
    });
});

// When an invite is created (update cache)
client.on(Events.InviteCreate, async (invite) => {
    console.log(`📨 Invite created: ${invite.code} by ${invite.inviter?.tag}`);
    
    // Update cache
    await cacheGuildInvites(invite.guild);
    
    await sendToWebhook('invite_create', {
        code: invite.code,
        inviterId: invite.inviter?.id,
        inviterTag: invite.inviter?.tag,
        channelId: invite.channel.id,
        channelName: invite.channel.name,
        maxUses: invite.maxUses || 'unlimited',
        expiresAt: invite.expiresAt,
        temporary: invite.temporary,
        guildId: invite.guild?.id,
        guildName: invite.guild?.name
    });
});

// When an invite is deleted (update cache)
client.on(Events.InviteDelete, async (invite) => {
    console.log(`📨 Invite deleted: ${invite.code}`);
    
    // Update cache
    await cacheGuildInvites(invite.guild);
    
    await sendToWebhook('invite_delete', {
        code: invite.code,
        channelId: invite.channel.id,
        guildId: invite.guild?.id,
        guildName: invite.guild?.name
    });
});

// When bot joins a new server (cache invites)
client.on(Events.GuildCreate, async (guild) => {
    console.log(`🎉 Joined new server: ${guild.name} (ID: ${guild.id})`);
    
    // Cache invites for the new server
    await cacheGuildInvites(guild);
    
    await sendToWebhook('guild_create', {
        guildId: guild.id,
        guildName: guild.name,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        createdAt: guild.createdAt
    });
});

// When bot is removed from a server
client.on(Events.GuildDelete, async (guild) => {
    console.log(`😢 Removed from server: ${guild.name} (ID: ${guild.id})`);
    
    // Remove from cache
    inviteCache.delete(guild.id);
    
    await sendToWebhook('guild_delete', {
        guildId: guild.id,
        guildName: guild.name
    });
});

// Health check endpoint
const healthApp = express();
const HEALTH_PORT = process.env.HEALTH_PORT || 3100;

healthApp.get('/health', (req, res) => {
    if (client.isReady()) {
        res.status(200).json({
            bot: process.env.BOT_NAME || 'Discord Event Tracker',
            status: 'healthy',
            uptime: process.uptime(),
            guilds: client.guilds.cache.size,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(503).json({ 
            bot: process.env.BOT_NAME || 'Discord Event Tracker',
            status: 'unhealthy',
            timestamp: new Date().toISOString()
        });
    }
});

healthApp.listen(HEALTH_PORT, () => {
    console.log(`🏥 Health check server running on port ${HEALTH_PORT}`);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
