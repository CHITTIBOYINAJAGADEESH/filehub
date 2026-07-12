const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper for making authenticated requests
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("filehub_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${res.status}`);
  }

  return res.json();
}

// Event listeners for auth state changes
const authListeners = new Set();

export const supabase = {
  auth: {
    signUp: async ({ email, password }) => {
      try {
        const data = await apiFetch("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        const session = data.session;
        localStorage.setItem("filehub_token", session.access_token);
        localStorage.setItem("filehub_session", JSON.stringify(session));
        authListeners.forEach((callback) => callback("SIGNED_IN", session));
        return { data: { session, user: session.user }, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message } };
      }
    },
    signInWithPassword: async ({ email, password }) => {
      try {
        const data = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        const session = data.session;
        localStorage.setItem("filehub_token", session.access_token);
        localStorage.setItem("filehub_session", JSON.stringify(session));
        authListeners.forEach((callback) => callback("SIGNED_IN", session));
        return { data: { session, user: session.user }, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message } };
      }
    },
    signOut: async () => {
      localStorage.removeItem("filehub_token");
      localStorage.removeItem("filehub_session");
      authListeners.forEach((callback) => callback("SIGNED_OUT", null));
      return { error: null };
    },
    getSession: async () => {
      const sessionStr = localStorage.getItem("filehub_session");
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          return { data: { session }, error: null };
        } catch (e) {
          return { data: { session: null }, error: null };
        }
      }
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (callback) => {
      authListeners.add(callback);
      // Immediately run with current session
      const sessionStr = localStorage.getItem("filehub_session");
      let session = null;
      if (sessionStr) {
        try {
          session = JSON.parse(sessionStr);
        } catch (e) {}
      }
      callback(session ? "SIGNED_IN" : "SIGNED_OUT", session);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
    updateUser: async ({ password }) => {
      try {
        await apiFetch("/api/auth/password", {
          method: "PUT",
          body: JSON.stringify({ password }),
        });
        return { data: { user: null }, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message } };
      }
    },
  },
  from: (tableName) => {
    return {
      select: (fields) => {
        return {
          eq: (field, val) => {
            return {
              single: async () => {
                try {
                  const endpoint = tableName === "profiles" ? "/api/profiles" : `/api/${tableName}?${field}=${val}`;
                  const res = await apiFetch(endpoint);
                  return { data: res.data, error: null };
                } catch (err) {
                  return { data: null, error: { message: err.message } };
                }
              },
              maybeSingle: async () => {
                try {
                  const endpoint = tableName === "profiles" ? "/api/profiles" : `/api/${tableName}?${field}=${val}`;
                  const res = await apiFetch(endpoint);
                  return { data: res.data, error: null };
                } catch (err) {
                  return { data: null, error: null };
                }
              },
              order: (orderField, { ascending } = {}) => {
                return {
                  then: async (resolve) => {
                    try {
                      const res = await apiFetch(`/api/${tableName}`);
                      resolve({ data: res.data, error: null });
                    } catch (err) {
                      resolve({ data: null, error: { message: err.message } });
                    }
                  },
                };
              },
              then: async (resolve) => {
                try {
                  const res = await apiFetch(`/api/${tableName}`);
                  resolve({ data: res.data, error: null });
                } catch (err) {
                  resolve({ data: null, error: { message: err.message } });
                }
              },
            };
          },
          then: async (resolve) => {
            try {
              const res = await apiFetch(`/api/${tableName}`);
              resolve({ data: res.data, error: null });
            } catch (err) {
              resolve({ data: null, error: { message: err.message } });
            }
          },
        };
      },
      insert: async (data) => {
        try {
          const endpoint = tableName === "files" && data.is_text_note 
            ? "/api/files/note" 
            : `/api/${tableName}`;
          const res = await apiFetch(endpoint, {
            method: "POST",
            body: JSON.stringify(data),
          });
          return { data: res.data, error: null };
        } catch (err) {
          return { data: null, error: { message: err.message } };
        }
      },
      update: (data) => {
        return {
          eq: (field, val) => {
            return {
              then: async (resolve) => {
                try {
                  const res = await apiFetch(`/api/${tableName}`, {
                    method: "PUT",
                    body: JSON.stringify(data),
                  });
                  resolve({ data: res.data, error: null });
                } catch (err) {
                  resolve({ data: null, error: { message: err.message } });
                }
              },
            };
          },
        };
      },
      delete: () => {
        return {
          eq: (field, val) => {
            return {
              then: async (resolve) => {
                try {
                  const res = await apiFetch(`/api/${tableName}?${field}=${val}`, {
                    method: "DELETE",
                  });
                  resolve({ data: res.data, error: null });
                } catch (err) {
                  resolve({ data: null, error: { message: err.message } });
                }
              },
            };
          },
        };
      },
    };
  },
  storage: {
    from: (bucket) => {
      return {
        upload: async (pathName, file, options = {}) => {
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("path", pathName);
            
            const token = localStorage.getItem("filehub_token");
            const headers = {
              "X-Storage-Path": pathName,
            };
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_URL}/api/storage/upload/${bucket}`, {
              method: "POST",
              headers,
              body: formData,
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || `HTTP error! Status: ${res.status}`);
            }

            const result = await res.json();
            return { data: result.data, error: null };
          } catch (err) {
            return { data: null, error: { message: err.message } };
          }
        },
        remove: async (paths) => {
          try {
            await apiFetch(`/api/storage/remove/${bucket}`, {
              method: "DELETE",
              body: JSON.stringify({ paths }),
            });
            return { data: null, error: null };
          } catch (err) {
            return { data: null, error: { message: err.message } };
          }
        },
        getPublicUrl: (filePath) => {
          return {
            data: {
              publicUrl: `${API_URL}/uploads/${filePath}`,
            },
          };
        },
        createSignedUrl: async (filePath, expiry) => {
          return {
            data: {
              signedUrl: `${API_URL}/uploads/${filePath}`,
            },
            error: null,
          };
        },
      };
    },
  },
};
