module.exports = (obj) => Object.entries(obj).find(([a,b]) => Boolean(b)) || false;