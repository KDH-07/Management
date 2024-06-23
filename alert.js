const axios = require('axios');
const fs = require('fs');
const schedule = require('node-schedule');

const API_KEYS = ['AIxxxxxxxxxxxxxx', 'AIxxxxxxxxxxxxxx']; // Your YouTube Data API v3 Keys
let currentKeyIndex = 0;

const bannedChannels = fs.existsSync('banned_channels.json') ? JSON.parse(fs.readFileSync('banned_channels.json')) : [];

async function getLiveChatMessages(liveStreamingId, apiKey) {
  const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${liveStreamingId}&key=${apiKey}`);
  const liveChatId = response.data.items[0].liveStreamingDetails.activeLiveChatId;

  const response2 = await axios.get(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&maxResults=2000&key=${apiKey}`);
  return response2.data.items;
}

function checkBannedChannels(messages) {
    const bannedChannelNames = ['신한', '하나', '기업', '우리', '국민', '카뱅', '농협','.xxx','.xyz']; // Words you want to block
    const newlyBannedChannels = [];

    for (const message of messages) {
      const authorName = message.authorDetails.displayName;
      const authorChannelId = message.authorDetails.channelId; // Channel ID Get

      if (bannedChannelNames.some(name => authorName.includes(name)) && !bannedChannels.find(channel => channel.id === authorChannelId)) {
        const newChannel = {
          name: authorName,
          id: authorChannelId, // Channel ID Add
          detectedTime: new Date().toISOString()
        };
        bannedChannels.push(newChannel);
        newlyBannedChannels.push(newChannel);
      }
    }

    fs.writeFileSync('banned_channels.json', JSON.stringify(bannedChannels));

    return newlyBannedChannels;
  }

function sendDiscordWebhook(channels) {
  const webhookUrl = 'https://discord.com/api/webhooks/'; // Discord WebHook

  for (const channel of channels) {
    axios.post(webhookUrl, {
      content: "<@Channel ID> 조치바람",
      embeds: [{
        title: "비정상적인 채널명 탐지됨",
        description: channel.name,
        url: "https://www.youtube.com/watch?v=Your_YT_Live_Stream_ID",
        color: 16734296,
        author: { name: "유튜브 채팅 검열기" },
        timestamp: channel.detectedTime
      }]
    });
  }
}

async function run() {
  try {
    const apiKey = API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;

    const messages = await getLiveChatMessages('Your_YT_Live_Stream_ID', apiKey);
    const newlyBannedChannels = checkBannedChannels(messages);
    sendDiscordWebhook(newlyBannedChannels);
  } catch (error) {
    console.error(error);
  }
}

schedule.scheduleJob('*/3 * * * * *', run); // 3s loop