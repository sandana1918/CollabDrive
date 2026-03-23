import api from "./client";

export const authApi = {
  register: (payload) => api.post("/auth/register", payload),
  login: (payload) => api.post("/auth/login", payload),
  me: () => api.get("/auth/me"),
  updatePreferences: (payload) => api.patch("/auth/preferences", payload),
  notifications: () => api.get("/auth/notifications"),
  markNotificationsRead: () => api.post("/auth/notifications/read")
};

export const filesApi = {
  list: (params) => api.get("/files", { params }),
  activity: () => api.get("/files/activity"),
  upload: (formData) => api.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  createDocument: (payload) => api.post("/files/documents", payload),
  createFolder: (payload) => api.post("/files/folders", payload),
  getDocument: (id, params) => api.get(`/files/${id}/content`, { params }),
  saveDocument: (id, payload) => api.patch(`/files/${id}/content`, payload),
  rename: (id, payload) => api.patch(`/files/${id}/rename`, payload),
  move: (id, payload) => api.patch(`/files/${id}/move`, payload),
  bulk: (payload) => api.post("/files/bulk", payload),
  toggleFavorite: (id, kind) => api.patch(`/files/${id}/favorite/${kind}`),
  trash: (id) => api.patch(`/files/${id}/trash`),
  restore: (id) => api.patch(`/files/${id}/restore`),
  addComment: (id, payload) => api.post(`/files/${id}/comments`, payload),
  resolveComment: (id, commentId, payload) => api.patch(`/files/${id}/comments/${commentId}`, payload),
  restoreVersion: (id, versionId) => api.post(`/files/${id}/versions/${versionId}/restore`),
  delete: (id) => api.delete(`/files/${id}`),
  downloadUrl: (id, linkToken = null) => {
    const token = localStorage.getItem("collabdrive-token");
    const suffix = linkToken ? `linkToken=${linkToken}` : `token=${token}`;
    return `${api.defaults.baseURL}/files/${id}/download?${suffix}`;
  }
};

export const sharingApi = {
  share: (id, payload) => api.post(`/sharing/${id}`, payload),
  updateSettings: (id, payload) => api.patch(`/sharing/${id}/settings`, payload),
  revokeAll: (id) => api.post(`/sharing/${id}/revoke-all`),
  unshare: (id, userId) => api.delete(`/sharing/${id}/${userId}`)
};
