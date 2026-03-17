export const appendActivity = (file, actorId, action, metadata = {}) => {
  file.activity.unshift({
    actor: actorId,
    action,
    metadata,
    createdAt: new Date()
  });

  file.activity = file.activity.slice(0, 40);
};
