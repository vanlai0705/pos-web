/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDSeQOTuP5PMi0mafki1at4qF8XJwxID8M',
  authDomain: 'posmobile-b7bc4.firebaseapp.com',
  projectId: 'posmobile-b7bc4',
  storageBucket: 'posmobile-b7bc4.firebasestorage.app',
  messagingSenderId: '906877367710',
  appId: '1:906877367710:web:f93701e74d50703defd28f',
  measurementId: 'G-BDK0HDEYPS',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    payload?.data?.Name ||
    'Thông báo mới'
  const options = {
    body: payload?.notification?.body || payload?.data?.body || payload?.data?.Detail || '',
    icon: '/logo.png',
    data: payload?.data || {},
  }

  self.registration.showNotification(title, options)
})
