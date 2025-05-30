// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyD6xPG5JalBHqYvWED9q0ePI2M4qkr9yIo",
    authDomain: "heyo-7df13.firebaseapp.com",
    projectId: "heyo-7df13",
    storageBucket: "heyo-7df13.firebasestorage.app",
    messagingSenderId: "83818780952",
    appId: "1:83818780952:web:6d1d682391dc2f43d3a66d"
};

// Init
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// UI References

// Home UI
const homeSection = document.getElementById("homeSection");
const soundImage = document.getElementById('soundImage');
const clickSound = document.getElementById('clickSound');

// Kissees UI
const kisseeSection = document.getElementById("kisseeSection");
const addKisseeBtn = document.getElementById("addKisseeBtn");
const kisseeEmailInput = document.getElementById("kisseeEmail");
const kisseePassInput = document.getElementById("kisseePass");
const kisseeStatus = document.getElementById("kisseeStatus");
const kisseeListEl = document.getElementById("kisseeList");

// Settings UI
const settingsSection = document.getElementById("settingsSection");
const userInfo = document.getElementById("userInfo");
const secretInput = document.getElementById("secretInput");
const savePassBtn = document.getElementById("savePassBtn");
const clearPassBtn = document.getElementById("clearPassBtn");
const tokenDisplay = document.getElementById("tokenDisplay");

// Navbar
const signInBtn = document.getElementById("signInBtn");
const toHomeBtn = document.getElementById("toHome");
const toKisseesBtn = document.getElementById("toKissees");
const toSettingsBtn = document.getElementById("toSettings");

// Helpers
function encodeEmail(email) {
    return email.replaceAll('.', ',').replaceAll('@', '_');
}

function playClickSound() {
    clickSound.currentTime = 0;
    clickSound.play();
}

registerCaching();

signInBtn.onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => alert("Sign-in error: " + err.message));
};

// Initialize Firebase
auth.onAuthStateChanged(function (user) {
    if (user) {
        toHomeBtn.style.display = "block";
        toKisseesBtn.style.display = "block";
        toSettingsBtn.style.display = "block";

        signInBtn.style.display = "none";
        userInfo.textContent = `Signed in as: ${user.displayName} (${user.email})`;

        getUserMessagingData(user).then(payload => {
            registerMessaging(async (token) => {
                tokenDisplay.textContent = `FCM token: ${token}`;
                let secret = payload ? payload.secret : undefined;
                if (!payload || payload.token !== token) {
                    const safeEmail = encodeEmail(user.email);
                    const tokenRef = db.collection("fcmTokens").doc(safeEmail);
                    tokenRef.set({
                        email: user.email,
                        token: token,
                        timestamp: Date.now()
                    }, { merge: true });
                }
                if (secret === undefined) {
                    navigateTo("settings");
                    // 
                    alert("Please set a secret in settings to use the app, don't use an actual password.");
                }
            });
            listenToKissees(user);
        });
    }
});

async function getUserMessagingData(user) {
    if (!user || auth.currentUser === null) {
        return null;
    }

    const safeEmail = encodeEmail(user.email);
    const tokenRef = db.collection("fcmTokens").doc(safeEmail);
    const payload = await tokenRef.get().then(doc => doc.exists ? doc.data() : null);
    return payload
}

// Register caching service worker
function registerCaching() {
    if ('serviceWorker' in navigator) {
        try {
            navigator
                .serviceWorker
                .register('sw-caching.js');
        }
        catch (e) {
            console.log('SW registration failed');
        }
    }
}

// Register messaging service worker
function registerMessaging(tokenCallback) {
    const messaging = firebase.messaging();
    if ('serviceWorker' in navigator) {
        try {
            navigator.serviceWorker.register("sw-messaging.js")
                .then((registration) => {
                    return messaging.getToken({
                        vapidKey: "BFbhx9L4-SkXyzPvsKFQWYiO03nGhq-o9VnBC1n66dTccq1wPNF78EbJTvOsbWoPyOE-0hNxjE5iE7XB2DBkIWs",
                        serviceWorkerRegistration: registration
                    });
                })
                .then((token) => {
                    tokenCallback(token);
                })
                .catch((err) => {
                    console.error("Error getting FCM token:", err);
                });
        }
        catch (e) {
            console.log('SW registration failed');
        }
    }
}

// ---------- Settings ---------- ///
savePassBtn.onclick = async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be signed in to save a secret.");
        return;
    }

    const secret = secretInput.value.trim();
    if (secret.length < 3) {
        alert("Secret must be at least 3 characters long.");
        return;
    }

    const safeEmail = encodeEmail(user.email);
    const tokenRef = db.collection("fcmTokens").doc(safeEmail);
    try {
        await tokenRef.set({
            email: user.email,
            secret: secret,
            timestamp: Date.now()
        }, { merge: true });
        alert("Secret saved successfully!");
        navigateTo("home");
    } catch (error) {
        console.error("Error saving secret:", error);
        alert("Failed to save secret. Please try again.");
    }
}

clearPassBtn.onclick = () => {
    secretInput.value = "";
}
/// ---------- Settings END ---------- ///

/// ---------- Kissees ---------- ///
addKisseeBtn.onclick = async () => {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    const kisseeEmail = kisseeEmailInput.value.trim().toLowerCase();
    const secret = kisseePassInput.value.trim();
    if (!kisseeEmail || !secret) {
        kisseeStatus.textContent = "Email and secret required.";
        return;
    }

    const kisseeDoc = await db.collection("fcmTokens").doc(encodeEmail(kisseeEmail)).get();

    if (!kisseeDoc.exists) {
        kisseeStatus.textContent = "User not found.";
        return;
    }

    const data = kisseeDoc.data();
    if (data.secret !== secret) {
        kisseeStatus.textContent = "Incorrect secret.";
        return;
    }

    // Add to your kissee list
    await db.collection("users")
        .doc(encodeEmail(currentUser.email))
        .collection("kissees")
        .doc(encodeEmail(kisseeEmail))
        .set({
            email: kisseeEmail,
            addedAt: Date.now()
        });
};

function listenToKissees(user) {
    console.log(user);

    db.collection("users")
        .doc(encodeEmail(user.email))
        .collection("kissees")
        .orderBy("addedAt", "desc")
        .onSnapshot(snapshot => {
            kisseeListEl.innerHTML = "";

            if (snapshot.empty) {
                kisseeListEl.innerHTML = "<li>No kissees yet</li>";
                return;
            }

            snapshot.forEach(doc => {
                createKisseeListItem(doc, user);
            });
        });
}

function createKisseeListItem(doc, fromUser) {
    const kissee = doc.data();
    const li = document.createElement("li");
    li.textContent = kissee.email + " ";

    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send Kissy";

    sendBtn.onclick = () => {
        let message = prompt("Add an optional message with your kissy:");
        if (message === null) {
            return;
        }
        sendMessage(kissee.email,
            message === "" ? "😘" : message).then(() => {
                playClickSound();
            }).catch(err => {
                console.error("Error sending kissy:", err);
                alert("Failed to send kissy. Please try again.");
            });
    };

    const viewBtn = document.createElement("button");
    viewBtn.textContent = "View Kissies";
    viewBtn.style.marginLeft = "1rem";
    const messageBox = document.createElement("div");
    messageBox.style.display = "none";
    messageBox.style.marginLeft = "1rem";

    let unsubscribeSent = null;
    let unsubscribeReceived = null;

    viewBtn.onclick = async () => {
        messageBox.innerHTML = "";
        messageBox.style.display = messageBox.style.display === "none" ? "block" : "none";
        if (messageBox.style.display === "none") {
            if (unsubscribeSent) unsubscribeSent();
            if (unsubscribeReceived) unsubscribeReceived();
            return;
        }
        let safeToEmail = encodeEmail(kissee.email)
        let safeFromEmail = encodeEmail(fromUser.email)

        const sentRef = await db.collection("users")
            .doc(safeFromEmail)
            .collection("kissees")
            .doc(safeToEmail)
            .collection("messages")
            .orderBy("sentAt");

        const receivedRef = await db.collection("users")
            .doc(safeToEmail)
            .collection("kissees")
            .doc(safeFromEmail)
            .collection("messages")
            .orderBy("sentAt");

        let sentMessages = null;
        let receivedMessages = null;

        const renderMessages = (messages) => {
            messageBox.innerHTML = "";
            messages.forEach(msg => {
                const sentAt = msg.sentAt?.toDate();
                const timeString = sentAt ? sentAt.toLocaleString() : '';

                const messageEl = document.createElement('div');
                messageEl.innerHTML = `
                <div class="message">
                <div>${msg.direction === "sent" ? "Kissee" : "You"}: ${msg.body}</div>
                <small style="color: gray; font-size: 0.75em;">${timeString}</small>
                </div>
            `;
                messageBox.appendChild(messageEl);
            });
        }

        const updateUI = () => {
            if (sentMessages === null || receivedMessages === null) {
                return;
            }
            const allMessages = [...sentMessages, ...receivedMessages];
            allMessages.sort((a, b) => {
                const timeA = a.sentAt?.toMillis?.() ?? 0;
                const timeB = b.sentAt?.toMillis?.() ?? 0;
                return timeA - timeB;
            });
            
            viewBtn.textContent = messageBox.style.display === "none" ? "View Kissies" : `View Kissies (${allMessages.length})`;
            renderMessages(allMessages);
        };

        unsubscribeSent = sentRef.onSnapshot(snapshot => {
            if (sentMessages === null) {
                sentMessages = [];
            }
            sentMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                direction: "sent",
                ...doc.data()
            }));
            updateUI();
        });

        unsubscribeReceived = receivedRef.onSnapshot(snapshot => {
            if (receivedMessages === null) {
                receivedMessages = [];
            }
            receivedMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                direction: "received",
                ...doc.data()
            }));
            updateUI();
        });
    };

    li.appendChild(sendBtn);
    li.appendChild(viewBtn);
    li.appendChild(messageBox);
    kisseeListEl.appendChild(li);
}
/// Kissees END ///


// ---------- Messaging ---------- ///
async function sendMessage(toEmail, body) {
    const safeToEmail = encodeEmail(toEmail);
    const safeFromEmail = encodeEmail(firebase.auth().currentUser.email);

    if (!body || !safeToEmail) return;
    await db.collection("users")
        .doc(safeToEmail)
        .collection("kissees")
        .doc(safeFromEmail)
        .collection("messages").add({
            body,
            sentAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    const tokenSnap = await db.collection("fcmTokens").doc(safeToEmail).get();
    const token = tokenSnap.exists ? tokenSnap.data().token : null;

    if (!token) return;

    // Step 3: Send FCM push
    fetch("https://heyokissy.netlify.app/.netlify/functions/sendNotification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            to: token,
            title: "Kissy",
            body
        })
    });
}

if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
    });
}
// ---------- Messaging END ---------- ///

// Navigation
let currentSection = "home";
function navigateTo(section) {
    navigateFrom(currentSection);
    switch (section) {
        case "home":
            homeSection.style.display = "block";
            currentSection = "home";
            break;
        case "kissee":
            kisseeSection.style.display = "block";
            currentSection = "kissee";
            break;
        case "settings":
            settingsSection.style.display = "block";
            currentSection = "settings";
            break;
    }
}
function navigateFrom(section) {
    switch (section) {
        case "home":
            homeSection.style.display = "none";
            break;
        case "kissee":
            kisseeSection.style.display = "none";
            break;
        case "settings":
            settingsSection.style.display = "none";
            break;
    }
}

toHomeBtn.onclick = (e) => {
    navigateTo("home");
}
toKisseesBtn.onclick = (e) => {
    navigateTo("kissee");
}
toSettingsBtn.onclick = (e) => {
    navigateTo("settings");
}

// Make sound on click
soundImage.addEventListener('click', () => {
    playClickSound();
});

navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data?.type === 'PUSH_IN_FOREGROUND') {
    const { title, body, icon } = event.data.payload;

    // Show notification manually
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon,
      });
    }
  }
});