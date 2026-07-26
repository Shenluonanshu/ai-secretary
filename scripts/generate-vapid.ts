import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("VAPID keys generated:");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("");
console.log("Add these to your .env.local file.");
