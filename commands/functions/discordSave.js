const { Client } = require('pg');
const axios = require("axios");
const { json } = require('express');

const client = new Client({
  host: 'ec2-34-197-135-44.compute-1.amazonaws.com',
  database: 'd5rihqokl7rml4',
  port: 5432,
  user: 'kslhgnrsyjpziy',
  password: 'e2f7eed33bca627d1b0261f171f2b329a934705ff1e619686c19c9eb3ff6ae39',
  connectionString: 'postgres://kslhgnrsyjpziy:e2f7eed33bca627d1b0261f171f2b329a934705ff1e619686c19c9eb3ff6ae39@ec2-34-197-135-44.compute-1.amazonaws.com:5432/d5rihqokl7rml4',
  ssl: {
    rejectUnauthorized: false
  }
})
client.connect()

let rand = function () {
  return Math.random().toString(36).substr(2);
};

let getRoles = async function (groupId) {
  let res = null;
  try {
    const data = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/roles`)
    res = data.data.roles;
  } finally {
    return res;
  }
}

let getGroupData = async function (guildId) {
  let res = null;
  try {
    const data = await client.query("SELECT * FROM groupList WHERE guildid= " + guildId + ";")
    res = JSON.parse(data.rows[0].groupdata)
  } finally {
    return res;
  }
}

let setRoles = function(guildId, data){
  client.query("UPDATE groupList SET ranks='" + JSON.stringify(data).replace(/'/g, '`') + "' WHERE guildid=" + guildId + ";")
}

let getRoles = async function(guildId){
  let res = null;
  try {
    const data = await client.query("SELECT * FROM groupList WHERE guildid= " + guildId + ";")
    res = JSON.parse(data.rows[0].ranks)
  } finally {
    return res;
  }
}

let setGroupData = async function(guildId, data) {
  let res = null;
  try {
    let ranksArray = []
    const roles = await getRoles(data.id)
    roles.forEach(roleData => ranksArray.push({ name: roleData.name, rank: roleData.rank, points: "LOCKED", status: "Default" }));
    client.query("UPDATE groupList SET ranks='" + JSON.stringify(ranksArray).replace(/'/g, '`') + "' WHERE guildid=" + guildId + ";")
    client.query("UPDATE groupList SET groupdata='" + JSON.stringify(data).replace(/'/g, '`') + "' WHERE guildid=" + guildId + ";")
  } finally {
    return res
  }
}

let createNewGroup = async function (guildId, groupData) {
  let res = null;
  try {
    const token = rand() + rand() + rand() + rand()

    let ranksArray = []
    const roles = await getRoles(groupData.id)
    roles.forEach(roleData => ranksArray.push({ name: roleData.name, rank: roleData.rank, points: "LOCKED", status: "Default" }));
    client.query("INSERT INTO groupList VALUES (" + guildId + ", '" + token + "', '" + JSON.stringify(groupData).replace(/'/g, '`') + "', '[]', '" + JSON.stringify(ranksArray) + "');")
    return token;
  } finally {
    return res;
  }
}

let generateNewAuthToken = function (guildId) {
  const token = rand() + rand() + rand() + rand()
  client.query("UPDATE groupList SET token='" + token + "' WHERE guildid=" + guildId + ";")
  return token;
}

let getAuthToken = async function (guildId) {
  let res = null;
  try {
    const data = await client.query("SELECT * FROM groupList WHERE guildid= " + guildId + ";")
    res = data.rows[0].token
  } finally {
    return res
  }
}

let updatePlayerData = function (token, newPlayerData) {
  client.query("SELECT * FROM groupList WHERE token LIKE '%" + token + "%';", (err, res) => {
    if (err) throw err
    if (res.rowCount === 0) return null;

    const playerID = newPlayerData.id

    let index
    let oldPlayerData = null;

    let data = JSON.parse(res.rows[0].playerdata)
    data.forEach((playerData, i) => {
      if (playerData.id == playerID) oldPlayerData = playerData; index = i;
    });

    if (oldPlayerData !== null) {
      data[index] = newPlayerData
    } else {
      data.push(newPlayerData)
    }

    client.query("UPDATE groupList SET playerdata='" + JSON.stringify(data) + "' WHERE token='" + token + "'")
  });
}

let getPlayerData = async function (token, playerID) {
  let resData = null;
  try {
    res = await client.query("SELECT * FROM groupList WHERE token LIKE '%" + token + "%';");
    const data = JSON.parse(res.rows[0].playerdata)
    data.forEach(playerData => {
      if (playerData.id == playerID) resData = playerData
    })
  } finally {
    return resData;
  }
}

module.exports = {
  setRoles,
  getRoles,
  getGroupData,
  setGroupData,
  createNewGroup,
  generateNewAuthToken,
  getAuthToken,
  getPlayerData,
  updatePlayerData
}