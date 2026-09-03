importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDhXoAdNf7eAT0GqrpNSHDN1x_Hd5JvzH4",
    authDomain: "aurora-comerciall.firebaseapp.com",
    projectId: "aurora-comerciall",
    storageBucket: "aurora-comerciall.firebasestorage.app",
    messagingSenderId: "998765354073",
    appId: "1:998765354073:web:ea2c6934e8e9d4cad3a548",
    measurementId: "G-FLB61EN4Q9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano:', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo auro.png',
        badge: '/logo auro.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});