const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

const lodash = require('lodash');

const serviceAccount = require('../config.json').firebase;

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const discordDataCache = new Map();
const firebaseTokensCache = new Map();

const tokenFromGuild = async function (guildid) {
  let responce = null;

  try {
    if (typeof firebaseTokensCache.get(guildid) === 'undefined') {
      console.log("Requesting Token Data from Firebase...")

      const collection = await db.collection('group').get()
      collection.forEach((doc) => {
        if (responce !== null) return;
        if (doc.data().discord_id == guildid) responce = doc.id; firebaseTokensCache.set(guildid, doc.id);
      })
    } else {
      responce = firebaseTokensCache.get(guildid)
    }
  } finally {
    return responce;
  }
}

const getDiscordData = async function (token) {
  let responce = null;

  try {
    if (typeof discordDataCache.get(token) === 'undefined') {
      console.log("Requesting Discord Data from Firebase...")

      const collection = await db.collection('group').get()
      collection.forEach((doc) => {
        if (responce !== null) return;
        if (doc.id === token) responce = doc.data(); discordDataCache.set(token, doc.data())
      })
    } else {
      responce = discordDataCache.get(token)
    }

  } finally {
    return responce;
  }
}

const setDiscordData = async function (token, newData) {
  if (!lodash.isEqual(newData, discordDataCache.get(token))) {
    console.log("Updating firebase!")

    const collection = db.collection('group').doc(token)
    await collection.set(newData); discordDataCache.set(token, newData)
  } else {
    console.log("No changes were made to DiscordData!")
  }
}

module.exports = {
  setDiscordData,
  getDiscordData,
  tokenFromGuild
}