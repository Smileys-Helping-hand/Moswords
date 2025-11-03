import { Message } from '../../models/Message.js';
import { Channel } from '../../models/Channel.js';

export const fetchMessages = async (req, res) => {
  const { channelId } = req.params;
  const messages = await Message.find({ channelId }).sort({ createdAt: 1 }).limit(200);
  res.json({ messages });
};

export const createMessage = async (req, res) => {
  const { channelId } = req.params;
  const { content, attachments } = req.body;

  const channel = await Channel.findById(channelId);
  if (!channel) {
    return res.status(404).json({ message: 'Channel not found' });
  }

  const message = await Message.create({
    channelId,
    senderId: req.user.id,
    content,
    attachments,
    mentions: []
  });

  req.io.to(`channel:${channelId}`).emit('channel:message', { message });
  res.status(201).json({ message });
};
