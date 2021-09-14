/* Notify users regarding critical security issues, Nex updates, broken updates etc.
Notification json is having following structure
{
    "ID": {
        "title": "Important Update",
        "message": "Version X.x is available",
        "versions": [
            "5.4"
        ],
        "olderthan": "",
        "url": ""
    }
  }

*/
const { app } = require('electron')
const { Notification } = require('electron')
const semver = require('semver')
const preference = require('./config')
const getJSON = require('get-json')
const path = require('path')
const notificationURL = 'https://nex.vercel.app/notifications.json'

/*declare globally to avoid garbage collection*/
let notification
function showNotification (title, message, callback) {
  //https://stackoverflow.com/questions/65859634/notification-from-electron-shows-electron-app-electron
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.name)
  }
  notification = new Notification({
    title: title,
    body: message,
    icon: path.join(__dirname, '..', 'icon.png')
  })
  notification.on('click', () => {
    if (typeof callback == 'function') callback()
  })
  notification.show()
}

function checkMessages () {
  try {
    let version = app.getVersion()
    let notificationShown = false
    getJSON(notificationURL, function (error, notifications) {
      if (error) return
      /* Get list of visited notifications, so that we don't have to show them again*/
      let visitedNotifications = preference.getPreference().notifications
      for (let notification in notifications) {
        /*Show the notification if
        - its not visited 
        - notification is for all versions
        - notification is for this specific version
        - current version is lesser than the one specified in the notification
        */
        if (
          !notificationShown &&
          !visitedNotifications.includes(notification) &&
          (notifications[notification].versions.includes('all') ||
            notifications[notification].versions.includes(version) ||
            (notifications[notification].olderthan &&
              semver.lte(version, notifications[notification].olderthan)))
        ) {
          notificationShown = true
          showNotification(
            notifications[notification].title,
            notifications[notification].message,
            () => {
              /*Treat the notification as visited once the user clicks on it*/
              preference.setPreference(
                'notifications',
                visitedNotifications.concat(notification)
              )
            }
          )
        }
      }
    })
  } catch (e) {
    console.log(e)
  }
}

app.on('ready', function () {
  setTimeout(() => {
    checkMessages()
  }, 60000)
})

module.exports = { notify: showNotification, checkMessages: checkMessages }
