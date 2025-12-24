## Discord Event Server - Bot Maintenance & Modification Guide

### Table of Contents
1. [Quick Reference Commands](#quick-reference-commands)
2. [Managing Your Bot with PM2](#managing-your-bot-with-pm2)
3. [Editing Your Bot Code](#editing-your-bot-code)
4. [Adding New Event Listeners](#adding-new-event-listeners)
5. [Modifying Existing Events](#modifying-existing-events)
6. [Common Event Templates](#common-event-templates)
7. [Troubleshooting](#troubleshooting)
8. [Working with Claude](#working-with-claude)

---

### Quick Reference Commands

#### Navigate to Your Bot Directory
```bash
cd /opt/discord-bot
```

#### View Bot Status
```bash
pm2 status
```

#### View Bot Logs
```bash
pm2 logs discord-bot
```

#### Restart Bot After Changes
```bash
pm2 restart discord-bot
```

#### Edit Bot Code
```bash
nano index.js
```

#### Check if Bot File Has Syntax Errors
```bash
node -c index.js
```

#### Changing Directories in the Console
```bash
# You're in /opt/discord-bot
cd ..           # Now in /opt
cd ..           # Now in /
cd ~            # Back to /root (your home)
cd /opt/discord-bot  # Back to your bot
```

---

### Managing Your Bot with PM2

#### Setting Up Additional Listener Bots

If you manage multiple Discord servers, each with their own admin/automation bot, you can run multiple bot instances on the same DigitalOcean droplet.

**Step-by-Step: Adding a Second Bot**

1. **Create a new directory for the second bot:**
   ```bash
   mkdir -p /opt/discord-bot-2
   cd /opt/discord-bot-2
   ```

2. **Initialize npm:**
   ```bash
   npm init -y
   ```

3. **Install dependencies:**
   ```bash
   npm install discord.js dotenv axios
   ```

4. **Copy the bot code from your first bot:**
   ```bash
   cp /opt/discord-bot/index.js /opt/discord-bot-2/index.js
   ```

5. **Create the .env file for bot #2:**
   ```bash
   nano .env
   ```
   
   Add the second bot's credentials:
   ```
   DISCORD_TOKEN=your_second_bot_token_here
   CLIENT_ID=your_second_bot_client_id
   WEBHOOK_URL=https://your-n8n-webhook-url
   ```
   
   Save (Ctrl+X, Y, Enter)

6. **Start the second bot with PM2:**
   ```bash
   pm2 start index.js --name discord-bot-2
   pm2 save
   ```

7. **Verify both bots are running:**
   ```bash
   pm2 status
   ```
   
   You should see:
   ```
   ┌─────┬──────────────────┬─────────┐
   │ id  │ name             │ status  │
   ├─────┼──────────────────┼─────────┤
   │ 0   │ discord-bot      │ online  │
   │ 1   │ discord-bot-2    │ online  │
   └─────┴──────────────────┴─────────┘
   ```

**Adding a Third, Fourth, Fifth Bot, etc.**

Repeat the process with incremental directory names:

```bash
# Bot #3
mkdir -p /opt/discord-bot-3
cd /opt/discord-bot-3
npm init -y
npm install discord.js dotenv axios
cp /opt/discord-bot/index.js /opt/discord-bot-3/index.js
nano .env  # Add bot #3 credentials
pm2 start index.js --name discord-bot-3
pm2 save

# Bot #4
mkdir -p /opt/discord-bot-4
cd /opt/discord-bot-4
# ... repeat process
```

**Managing Multiple Bots**

All bots will send events to the same n8n webhook. You can differentiate them by the `guildId` and `guildName` in the webhook payload.

**Useful commands for multiple bots:**
```bash
# View all bots
pm2 status

# View logs for a specific bot
pm2 logs discord-bot-2

# Restart a specific bot
pm2 restart discord-bot-2

# Restart all bots
pm2 restart all

# Stop all bots
pm2 stop all
```

#### Basic PM2 Commands

**View all running bots:**
```bash
pm2 status
```

**View logs in real-time:**
```bash
pm2 logs discord-bot
```

**View last 50 lines of logs:**
```bash
pm2 logs discord-bot --lines 50
```

**Stop the bot:**
```bash
pm2 stop discord-bot
```

**Start the bot:**
```bash
pm2 start discord-bot
```

**Restart the bot (use after code changes):**
```bash
pm2 restart discord-bot
```

**Delete the bot from PM2:**
```bash
pm2 delete discord-bot
```

**Save current PM2 configuration:**
```bash
pm2 save
```

**Monitor resource usage:**
```bash
pm2 monit
```

#### Managing Multiple Bots

**View all bots:**
```bash
pm2 status
```

**Restart specific bot:**
```bash
pm2 restart discord-bot-2
```

**Restart all bots:**
```bash
pm2 restart all
```

**Stop all bots:**
```bash
pm2 stop all
```

---

### Editing Your Bot Code

#### Step-by-Step Editing Process

1. **Navigate to bot directory:**
   ```bash
   cd /opt/discord-bot
   ```

2. **Create a backup (optional but recommended):**
   ```bash
   cp index.js index.js.backup-$(date +%Y%m%d-%H%M%S)
   ```

3. **Open the file in nano:**
   ```bash
   nano index.js
   ```

4. **Make your changes**

5. **Save and exit:**
   - Press `Ctrl+X`
   - Press `Y` to confirm
   - Press `Enter` to confirm filename

6. **Check for syntax errors:**
   ```bash
   node -c index.js
   ```
   If no output, you're good! If there's an error, it will show you the line number.

7. **Restart the bot:**
   ```bash
   pm2 restart discord-bot
   ```

8. **Check logs to verify it's working:**
   ```bash
   pm2 logs discord-bot
   ```

#### Nano Editor Quick Reference

- **Navigate:** Arrow keys
- **Jump to line:** `Ctrl+_` then type line number
- **Search:** `Ctrl+W` then type search term
- **Cut line:** `Ctrl+K`
- **Paste:** `Ctrl+U`
- **Save:** `Ctrl+O` then Enter
- **Exit:** `Ctrl+X`
- **Undo:** `Alt+U`

---

### Invite Tracking System

The bot includes an invite tracking system that detects which invite link was used when a member joins your server.

#### How It Works

1. **On Startup:** The bot caches all invite codes and their use counts for every server
2. **On Member Join:** The bot compares current invite uses with cached values to find which invite was used
3. **On Invite Create/Delete:** The cache is automatically updated

#### Permissions Required

Make sure your bot has the following permission:
- **Manage Server** or **View Invites** permission in your Discord server

#### Data Provided in Webhook

When a member joins, the `guild_member_add` event includes:

```json
{
  "event": "guild_member_add",
  "data": {
    "userId": "123456789",
    "tag": "NewUser#1234",
    "joinMethod": "invite",
    "inviteUsed": {
      "code": "abc123",
      "uses": 5,
      "maxUses": "unlimited",
      "channelId": "987654321",
      "channelName": "welcome",
      "temporary": false,
      "expiresAt": null
    },
    "inviter": {
      "id": "555666777",
      "tag": "Moderator#1234",
      "username": "Moderator"
    }
  }
}
```

#### Join Methods

The `joinMethod` field can be:
- `invite` - Joined via a tracked invite link
- `vanity_url` - Joined via server's vanity URL (if available)
- `discovery_or_other` - Joined via server discovery or other method
- `unknown` - Could not determine join method
- `error_tracking` - An error occurred while tracking

#### Troubleshooting Invite Tracking

**If invite tracking isn't working:**

1. **Check bot permissions:**
   ```
   Discord Server → Server Settings → Roles → Your Bot Role
   Enable: "View Invites" or "Manage Server"
   ```

2. **Check bot intents (already configured):**
   - The bot already has `GuildInvites` intent enabled

3. **Check logs for errors:**
   ```bash
   pm2 logs discord-bot | grep "invite"
   ```

4. **Manually refresh cache:**
   The cache refreshes automatically, but if you suspect issues, restart the bot:
   ```bash
   pm2 restart discord-bot
   ```

---

### Adding New Event Listeners

#### Where to Add New Events

New event listeners should be added **before** the final `client.login()` line (at the bottom of the file). Refer to the `index.js` file in this same repo for code examples.

#### Template for Adding a New Event

```javascript
// [Description of what this event does]
client.on(Events.EventName, async (parameter) => {
    console.log(`[Emoji] [Description]: ${parameter.property}`);
    
    await sendToWebhook('event_name', {
        // Add relevant data here
        key1: parameter.property1,
        key2: parameter.property2,
        guildId: parameter.guild?.id,
        guildName: parameter.guild?.name,
        timestamp: new Date().toISOString()
    });
});
```

#### Step-by-Step: Adding a New Event

1. **Open your bot file:**
   ```bash
   cd /opt/discord-bot
   nano index.js
   ```

2. **Navigate to the bottom** (before `client.login()`)

3. **Paste your new event listener**

4. **Save and exit** (Ctrl+X, Y, Enter)

5. **Check for errors:**
   ```bash
   node -c index.js
   ```

6. **Restart the bot:**
   ```bash
   pm2 restart discord-bot
   ```

7. **Verify it's working:**
   ```bash
   pm2 logs discord-bot
   ```

---

### Modifying Existing Events

#### Finding the Event You Want to Modify

**Search for an event:**
```bash
cd /opt/discord-bot
grep -n "EventName" index.js
```

Example:
```bash
grep -n "GuildMemberAdd" index.js
```

This shows you the line number where the event is defined.

#### Common Modifications

##### 1. Change What Data Gets Sent to Webhook

**Find the `sendToWebhook` call** inside the event and modify the data object:

```javascript
await sendToWebhook('guild_member_add', {
    // Add new fields:
    newField: member.someProperty,
    // Remove fields by deleting the line
    // Modify existing fields:
    username: member.user.username.toLowerCase()
});
```

##### 2. Add Console Logging

Add anywhere inside the event:
```javascript
console.log(`Debug info: ${variable}`);
```

##### 3. Add Conditional Logic

```javascript
if (member.user.bot) {
    // Do something special for bots
    console.log('A bot joined!');
    return; // Exit early
}

// Regular processing for non-bots
```

##### 4. Comment Out Code (Disable Without Deleting)

```javascript
// This line is disabled
// await sendToWebhook('event_name', { ... });

/* 
   This entire
   block is
   disabled
*/
```

---

### Common Event Templates

#### Voice State Update (User Joins/Leaves Voice Channel)

```javascript
// When a user joins, leaves, or switches voice channels
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const member = newState.member;
    
    // Joined a voice channel
    if (!oldState.channel && newState.channel) {
        console.log(`🎤 ${member.user.tag} joined voice channel: ${newState.channel.name}`);
        
        await sendToWebhook('voice_channel_join', {
            userId: member.user.id,
            userTag: member.user.tag,
            channelId: newState.channel.id,
            channelName: newState.channel.name,
            guildId: newState.guild.id,
            guildName: newState.guild.name
        });
    }
    
    // Left a voice channel
    if (oldState.channel && !newState.channel) {
        console.log(`🎤 ${member.user.tag} left voice channel: ${oldState.channel.name}`);
        
        await sendToWebhook('voice_channel_leave', {
            userId: member.user.id,
            userTag: member.user.tag,
            channelId: oldState.channel.id,
            channelName: oldState.channel.name,
            guildId: oldState.guild.id,
            guildName: oldState.guild.name
        });
    }
    
    // Switched voice channels
    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        console.log(`🎤 ${member.user.tag} switched from ${oldState.channel.name} to ${newState.channel.name}`);
        
        await sendToWebhook('voice_channel_switch', {
            userId: member.user.id,
            userTag: member.user.tag,
            oldChannelId: oldState.channel.id,
            oldChannelName: oldState.channel.name,
            newChannelId: newState.channel.id,
            newChannelName: newState.channel.name,
            guildId: newState.guild.id,
            guildName: newState.guild.name
        });
    }
});
```

#### Reaction Add/Remove

```javascript
// When a reaction is added to a message
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    console.log(`👍 ${user.tag} reacted with ${reaction.emoji.name}`);
    
    await sendToWebhook('message_reaction_add', {
        userId: user.id,
        userTag: user.tag,
        emoji: reaction.emoji.name,
        emojiId: reaction.emoji.id,
        messageId: reaction.message.id,
        channelId: reaction.message.channel.id,
        guildId: reaction.message.guild?.id
    });
});

// When a reaction is removed from a message
client.on(Events.MessageReactionRemove, async (reaction, user) => {
    console.log(`👎 ${user.tag} removed reaction ${reaction.emoji.name}`);
    
    await sendToWebhook('message_reaction_remove', {
        userId: user.id,
        userTag: user.tag,
        emoji: reaction.emoji.name,
        messageId: reaction.message.id,
        channelId: reaction.message.channel.id,
        guildId: reaction.message.guild?.id
    });
});
```

#### Thread Create/Delete

```javascript
// When a thread is created
client.on(Events.ThreadCreate, async (thread) => {
    console.log(`🧵 Thread created: ${thread.name}`);
    
    await sendToWebhook('thread_create', {
        threadId: thread.id,
        threadName: thread.name,
        parentChannelId: thread.parentId,
        ownerId: thread.ownerId,
        guildId: thread.guild.id,
        guildName: thread.guild.name
    });
});

// When a thread is deleted
client.on(Events.ThreadDelete, async (thread) => {
    console.log(`🧵 Thread deleted: ${thread.name}`);
    
    await sendToWebhook('thread_delete', {
        threadId: thread.id,
        threadName: thread.name,
        guildId: thread.guild.id,
        guildName: thread.guild.name
    });
});
```

#### Emoji Create/Delete

```javascript
// When an emoji is created
client.on(Events.GuildEmojiCreate, async (emoji) => {
    console.log(`😀 Emoji created: ${emoji.name}`);
    
    await sendToWebhook('emoji_create', {
        emojiId: emoji.id,
        emojiName: emoji.name,
        emojiUrl: emoji.url,
        animated: emoji.animated,
        guildId: emoji.guild.id,
        guildName: emoji.guild.name
    });
});

// When an emoji is deleted
client.on(Events.GuildEmojiDelete, async (emoji) => {
    console.log(`😀 Emoji deleted: ${emoji.name}`);
    
    await sendToWebhook('emoji_delete', {
        emojiId: emoji.id,
        emojiName: emoji.name,
        guildId: emoji.guild.id,
        guildName: emoji.guild.name
    });
});
```

#### Invite Create/Delete

```javascript
// When an invite is created
client.on(Events.InviteCreate, async (invite) => {
    console.log(`📨 Invite created by ${invite.inviter?.tag}`);
    
    await sendToWebhook('invite_create', {
        code: invite.code,
        inviterId: invite.inviter?.id,
        inviterTag: invite.inviter?.tag,
        channelId: invite.channel.id,
        channelName: invite.channel.name,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt,
        guildId: invite.guild?.id,
        guildName: invite.guild?.name
    });
});

// When an invite is deleted
client.on(Events.InviteDelete, async (invite) => {
    console.log(`📨 Invite deleted: ${invite.code}`);
    
    await sendToWebhook('invite_delete', {
        code: invite.code,
        channelId: invite.channel.id,
        guildId: invite.guild?.id,
        guildName: invite.guild?.name
    });
});
```

---

### Troubleshooting

#### Bot Won't Start

**Check logs:**
```bash
pm2 logs discord-bot --lines 50
```

**Common issues:**

1. **Syntax error in code:**
   ```bash
   node -c index.js
   ```
   This will show you the line number with the error.

2. **Missing dependencies:**
   ```bash
   cd /opt/discord-bot
   npm install
   ```

3. **Invalid token in .env:**
   ```bash
   cat .env
   ```
   Make sure your token is correct and has no extra spaces.

4. **Missing .env file:**
   ```bash
   ls -la /opt/discord-bot/.env
   ```
   If it doesn't exist, create it:
   ```bash
   nano .env
   ```

#### Bot Crashes Repeatedly

**Check PM2 status:**
```bash
pm2 status
```

If status shows "errored" or keeps restarting:

**View recent logs:**
```bash
pm2 logs discord-bot --lines 100
```

Look for error messages and the line numbers mentioned.

#### Syntax Errors

**Common syntax errors:**

1. **Missing closing brace `}`:**
   - Count opening `{` and closing `}` - they should match
   - Use a text editor with bracket matching

2. **Missing closing parenthesis `)`:**
   - Same as above, count `(` and `)`

3. **Missing semicolon `;`:**
   - JavaScript is forgiving but sometimes needs them

4. **Comment blocks:**
   - `/* comment */` must be closed
   - Make sure `});` aren't inside comments

**Check for errors before restarting:**
```bash
node -c index.js
```

#### Webhook Not Receiving Data

1. **Check webhook URL in .env:**
   ```bash
   cat .env | grep WEBHOOK_URL
   ```

2. **Test webhook manually:**
   ```bash
   curl -X POST YOUR_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

3. **Check bot logs for webhook errors:**
   ```bash
   pm2 logs discord-bot | grep webhook
   ```

#### Bot Missing Permissions

If events aren't firing, the bot might need additional permissions:

1. Go to Discord Developer Portal
2. Select your application → Bot
3. Enable required **Privileged Gateway Intents**:
   - Server Members Intent
   - Presence Intent (if using presence events)
   - Message Content Intent (if reading messages)

4. In your Discord server, check bot role permissions

---

### Working with Claude

#### How to Request Code Modifications

When asking Claude to modify your bot, provide:

1. **What you want to change:**
   - "Add an event listener for when users join voice channels"
   - "Modify the member remove event to include more data"

2. **Your current code (if relevant):**
   - Copy/paste the specific section you want to modify
   - Or mention "use the code from our previous conversation"

3. **Context about your setup:**
   - "I have multiple bots running on the same server"
   - "I want this to send different data to my webhook"

#### Example Requests

**Good request:**
> "Can you add an event listener that tracks when someone creates a new thread in my Discord server? I want it to send the thread name, creator, and parent channel to my webhook."

**Good request:**
> "I need to modify the GuildMemberRemove event to also include how long the member was in the server before leaving. Here's my current code: [paste code]"

**Good request:**
> "Can you create a template for tracking emoji reactions that I can add to my bot? I want to know who reacted, with what emoji, and on which message."

#### Getting Help Debugging

If your bot isn't working:

1. **Share the error from logs:**
   ```bash
   pm2 logs discord-bot --lines 30
   ```
   Copy the error and send to Claude

2. **Share relevant code section:**
   - Find the area mentioned in the error
   - Copy 10-20 lines around it

3. **Describe what you expected vs what happened:**
   - "I expected it to send webhook data when someone joins, but nothing happens"
   - "The bot crashes every time someone gets kicked"

#### Updating Your Maintenance Doc

When you make changes or discover new useful commands, update this document:

```bash
nano /opt/discord-bot/MAINTENANCE.md
```

Keep notes on:
- Custom event listeners you've added
- Specific configuration for your setup
- Common issues you've encountered and how you fixed them

---

### File Structure Reference

```
/opt/discord-bot/
├── index.js           # Main bot code
├── .env              # Secrets (token, webhook URL)
├── package.json      # Node.js dependencies
├── package-lock.json # Dependency lock file
└── node_modules/     # Installed packages

/opt/discord-bot-2/   # Second bot (if you have multiple)
├── index.js
├── .env
└── ...
```

---

### Useful Terminal Commands

#### File Management

**View file contents:**
```bash
cat index.js
```

**View last 20 lines:**
```bash
tail -20 index.js
```

**View first 20 lines:**
```bash
head -20 index.js
```

**Search for text in file:**
```bash
grep "search term" index.js
```

**Search with line numbers:**
```bash
grep -n "search term" index.js
```

**Count lines in file:**
```bash
wc -l index.js
```

#### System Management

**Check disk space:**
```bash
df -h
```

**Check memory usage:**
```bash
free -h
```

**Check running Node.js processes:**
```bash
ps aux | grep node
```

**Check system uptime:**
```bash
uptime
```

#### Node.js & npm

**Check Node.js version:**
```bash
node --version
```

**Check npm version:**
```bash
npm --version
```

**Install a new package:**
```bash
npm install package-name
```

**Update all packages:**
```bash
npm update
```

**List installed packages:**
```bash
npm list
```

---

### Quick Start Checklist for New Events

- [ ] Open bot file: `nano index.js`
- [ ] Add event listener before `client.login()`
- [ ] Include `sendToWebhook()` call with relevant data
- [ ] Save file: `Ctrl+X`, `Y`, `Enter`
- [ ] Check syntax: `node -c index.js`
- [ ] Restart bot: `pm2 restart discord-bot`
- [ ] Check logs: `pm2 logs discord-bot`
- [ ] Test the event in Discord
- [ ] Verify webhook received data in n8n

---

### Additional Resources

**Discord.js Documentation:**
- Full event list: https://discord.js.org/#/docs/discord.js/main/class/Client
- Event examples: https://discordjs.guide/popular-topics/events.html

**PM2 Documentation:**
- Official docs: https://pm2.keymetrics.io/docs/usage/quick-start/

**n8n Documentation:**
- Webhook node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

---

### Version History

- **v1.0** - Initial documentation
- Document created: [Current Date]
- Last updated: [Current Date]

---

**Remember:** Always test changes on a development bot first if possible, and keep backups of working configurations!
