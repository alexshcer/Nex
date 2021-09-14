const { autoUpdater } = require('electron-updater')
const preference = require('./config')
const notifier = require('./notifier')
const log = require('electron-log')
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'
/*Disable autodownload of updates if updates are found*/
autoUpdater.autoDownload = false

/*Autupdate/notify/ignore updates based on user preference*/
let updatePreferene = preference.getPreference('updateMethod').updateMethod
let updateNotificationShown = false
if (updatePreferene == 'auto') {
  autoUpdater.autoDownload = true
  autoUpdater.checkForUpdatesAndNotify()
} else if (updatePreferene == 'notify') {
  autoUpdater.checkForUpdates()
  autoUpdater.on('update-available', info => {
    if (!updateNotificationShown) {
      updateNotificationShown = true
      notifier.notify(
        'Update available',
        'New version of Nex Browser is available, click here to update in the background.',
        () => {
          notifier.notify(
            'Updating...',
            'We will notify you when update is ready, feel free to use Nex.',
            null
          )
          autoUpdater.autoDownload = true
          autoUpdater.checkForUpdatesAndNotify()
        }
      )
    }
  })
}
autoUpdater.on('error', error => {
  console.log(error)
})
