const plugins = new Map();

export const registerPlugin = (plugin) => {
  plugins.set(plugin.name, plugin);
};

export const getPlugins = () => Array.from(plugins.values());

registerPlugin({
  name: 'PollBot',
  description: 'Create lightweight polls inside channels',
  command: '/poll',
  handler: ({ io, payload }) => {
    io.to(`channel:${payload.channelId}`).emit('plugin:poll', payload);
  }
});

registerPlugin({
  name: 'ReminderBot',
  description: 'Schedule reminders inside direct messages',
  command: '/remind',
  handler: ({ io, payload }) => {
    io.to(`user:${payload.userId}`).emit('plugin:reminder', payload);
  }
});

export const dispatchPluginCommand = (command, context) => {
  const plugin = getPlugins().find((p) => p.command === command);
  if (plugin) {
    plugin.handler(context);
  }
};
