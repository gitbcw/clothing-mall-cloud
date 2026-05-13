function isValidPhone(str) {
  var myreg = /^1[3-9]\d{9}$/;
  if (!myreg.test(str)) {
    return false;
  } else {
    return true;
  }
}

module.exports = {
  isValidPhone
}