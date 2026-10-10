const SUPABASE_URL = "https://mslotfrlhxrnsefktdpn.supabase.co";
const SUPABASE_KEY = "sb_publishable_UM9QeUP8ajKpyitu3yeRmw_bZdMvEfA";



// Remember Me determines where Supabase stores its session.
// Checked = localStorage (survives browser restarts).
// Unchecked = sessionStorage (ends when the browser session ends).

const rememberStorage = {
    getItem(key) {
        const remember = localStorage.getItem("pawfect-remember-session");

        return remember === "session"
            ? sessionStorage.getItem(key)
            : localStorage.getItem(key);
    },

    setItem(key, value) {
        const remember = localStorage.getItem("pawfect-remember-session");

        if (remember === "session") {
            sessionStorage.setItem(key, value);
        } else {
            localStorage.setItem(key, value);
        }
    },

    removeItem(key) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }
};

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            storage: rememberStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);