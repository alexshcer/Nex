import React from 'react'
import ReactDOM from 'react-dom'
import DownloadPopup from './DownloadPopup'
import BlankTab from '../nativePages/BlankTab'
import '../../assets/css/controls.css'
import parseUrlInput from '../../functions/parseUrlInput'
import validateNexProtocol from '../../functions/validateNexProtocol'
import Settings from '../nativePages/Settings'
import loadFavicon from '../../functions/loadFavicon'

class Controls extends React.Component {
  constructor (props) {
    super(props)
    this.openDownloadsPage = this.openDownloadsPage.bind(this)
    this.handleClick = this.handleClick.bind(this)
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    this.state = {
      tabGroup: null,
      activeTab: 0,
      tab: null,
      canGoBack: false,
      canGoForward: false,
      tabs: [],
      popupVisible: false,
      searchEngine: null,
      isSiteSecure: true,
      isFirstRender: true,
      isfullScreen: false,
      istabWebview: false
    }
  }
  static getDerivedStateFromProps (nextProps, prevState) {
    if (nextProps.tabGroup !== prevState.tabGroup) {
      return { tabGroup: nextProps.tabGroup }
    }
    return null
  }
  componentDidMount () {
    window.preloadAPI.receive('focusURLbar', () => {
      this.inputField.focus()
    })
    window.preloadAPI.receive('newTab', () => {
      let newtab = this.state.tabGroup.addTab({
        title: 'Home',
        src: '',
        icon: 'fa fa-grip-horizontal',
        iconURL: 'icon.png',
        isNative: true,
        comp: BlankTab
      })
      newtab.activate()
    })
  }
  componentDidUpdate (prevProps) {
    if (prevProps.tabGroup !== this.props.tabGroup) {
      this.setState({ tabGroup: this.props.tabGroup })
      this.tabGroupEvents(this.state.tabGroup)
    }
  }
  handleOutsideClick (e) {
    if (this.node.contains(e.target)) {
      return
    }
    this.handleClick()
  }
  handleClick () {
    if (!this.state.popupVisible) {
      document.addEventListener('click', this.handleOutsideClick, false)
    } else {
      document.removeEventListener('click', this.handleOutsideClick, false)
    }
    this.setState(prevState => ({
      popupVisible: !prevState.popupVisible
    }))
  }
  updateTab = tab => {
    let tabs = [...this.state.tabs]
    tabs.push({
      id: tab.id,
      url: tab.webview.src,
      inputURL: tab.webview.src,
      tab
    })
    this.setState({ tabs }, () => {
      if (!tab.isNative) this.tabEvents(tab)
    })
  }
  tabEvents = tab => {
    tab.webview.addEventListener('did-start-loading', () => {
      tab.setIcon('', 'loader-rev')
      let tabs = [...this.state.tabs]
      tabs[tab.id].isNative = false
    })
    tab.webview.addEventListener('will-navigate', () => {
      tab.setIcon('', 'loader-rev')
    })
    tab.webview.addEventListener('load-commit', e => {
      tab.setIcon('', 'loader')
    })
    tab.webview.addEventListener('page-title-updated', () => {
      const newTitle = tab.webview.getTitle()
      tab.setTitle(newTitle)
    })
    loadFavicon(tab)

    tab.webview.addEventListener('did-stop-loading', () => {
      if (tab.iconList.length) {
        tab.setIcon(tab.iconList[0], '')
      }
      let tabs = [...this.state.tabs]
      let url = tab.webview.src
      tabs[tab.id].url = url
      /* If the URI is a pdf, download the pdf as pdf won't be loading in an in memory session */
      if (url.endsWith('.pdf')) {
        window.preloadAPI.send('downloadURL', url, false)
      }
      tabs[tab.id].inputURL = tab.webview.src
      tabs[tab.id].canGoBack = tab.webview.canGoBack()
      tabs[tab.id].canGoForward = tab.webview.canGoForward()
      this.setState({ tabs }, () => {
        if (tab.id === this.state.activeTab) {
          document.getElementById('location').value = this.state.tabs[
            tab.id
          ]?.url
          this.secureSiteCheck()
        }
      })
    })
    tab.webview.addEventListener('enter-html-full-screen', e => {
      this.setState({ isfullScreen: true })
      this.props.changeFullscreen()
    })
    tab.webview.addEventListener('leave-html-full-screen', e => {
      this.setState({ isfullScreen: false })
      this.props.changeFullscreen()
    })
    tab.webview.addEventListener('did-fail-load', e => {
      var data =
        "'<h3>Error loading page</h3><p>" +
        e.errorCode +
        ': ' +
        e.errorDescription +
        "</p>'"
      if (e.isMainFrame) {
        tab.webview.executeJavaScript('document.body.innerHTML+=' + data)
        setTimeout(() => {
          tab.setIcon('', 'fa fa-exclamation-circle')
        }, 30)
      }
    })
  }
  tabGroupEvents = tabGroup => {
    tabGroup.on('tab-added', (tab, tabGroup) => {
      if (tab.isNative) {
        ReactDOM.render(
          <tab.comp
            submitURL={this.submitURL}
            handleChange={this.handleChange}
            handleSearchEngineChange={this.handleSearchEngineChange}
            tabGroup={tabGroup}
            tab={tab}
            {...tab.compProps}
          />,
          tab.webview
        )
        document.getElementById('location').value = tab.webviewAttributes.src
      }
      this.updateTab(tab)
    })

    tabGroup.on('tab-active', (tab, tabGroup) => {
      this.setState({ istabWebview: tab.isNative })
      if (tab.src === '') {
        if (this.state.isFirstRender)
          setTimeout(() => {
            this.setState({ isFirstRender: false })
            this.inputField.focus()
          }, 500)
        else this.inputField.focus()
      }
      document.getElementById('location').value =
        this.state.tabs[tab.id]?.url || tab.webviewAttributes.src
      this.secureSiteCheck()
      this.setState({ activeTab: tab.id })
      if (tab.isNative) {
        ReactDOM.render(
          <tab.comp
            submitURL={this.submitURL}
            handleChange={this.handleChange}
            handleSearchEngineChange={this.handleSearchEngineChange}
            tabGroup={tabGroup}
            tab={tab}
            {...tab.compProps}
          />,
          tab.webview
        )
      }
    })

    tabGroup.on('tab-removed', (tab, tabGroup) => {
      if (tabGroup.getTabs().length === 0) {
        let newtab = tabGroup.addTab({
          title: 'Home',
          src: '',
          icon: 'fa fa-grip-horizontal',
          iconURL: 'icon.png',
          isNative: true,
          comp: BlankTab
        })
        newtab.activate()
      }
    })
    this.props.listenerReady()
  }
  handleChange = event => {
    let tabs = [...this.state.tabs]
    tabs[this.state.activeTab].inputURL = event.target.value
    this.setState({ tabs })
  }
  handleSearchEngineChange = searchEngine => {
    this.setState({ searchEngine: searchEngine })
  }
  submitURL = e => {
    e.preventDefault()
    let id = this.state.activeTab
    let sTab = this.state.tabs[id]
    let url = sTab.inputURL
    if (!url) return
    if (url.startsWith('nex://')) {
      validateNexProtocol(this.state.tabGroup, sTab.tab, url)
      return
    }
    url = parseUrlInput(sTab.inputURL, this.state.searchEngine)
    document.getElementById('location').value = url
    if (sTab.tab.isNative) {
      sTab.tab.removeNative(url)
      this.tabEvents(sTab.tab)
      sTab.tab.activate()
    } else {
      sTab.tab.webview.loadURL(url)
    }
  }
  goForward = () => {
    this.state.tabs[this.state.activeTab].tab.webview.goForward()
  }
  goBack = () => {
    this.state.tabs[this.state.activeTab].tab.webview.goBack()
  }
  reloadWebv = () => {
    this.state.tabs[this.state.activeTab].tab.webview.reload()
  }
  zoomInWebv = () => {
    if (this.state.tabs[this.state.activeTab].tab.isNative) return
    let zoomLevel = this.state.tabs[
      this.state.activeTab
    ].tab.webview.getZoomLevel()
    this.state.tabs[this.state.activeTab].tab.webview.setZoomLevel(
      zoomLevel + 1
    )
  }
  zoomOutWebv = () => {
    if (this.state.tabs[this.state.activeTab].tab.isNative) return
    let zoomLevel = this.state.tabs[
      this.state.activeTab
    ].tab.webview.getZoomLevel()
    this.state.tabs[this.state.activeTab].tab.webview.setZoomLevel(
      zoomLevel - 1
    )
  }
  activeWebView = () => {
    if (this.state.tabs[this.state.activeTab].tab.isNative) return
    this.state.tabs[this.state.activeTab].tab.webview.setZoomLevel(0)
  }
  removeMenu = () => {
    document.getElementById('menuDropdown').classList.remove('show')
  }
  secureSiteCheck = () => {
    var url = document.getElementById('location').value
    if (url && (url.startsWith('https://') || url.startsWith('nex://'))) {
      this.setState({ isSiteSecure: true })
    } else {
      this.setState({ isSiteSecure: false })
    }
  }
  openDownloadsPage () {
    let newtab = this.state.tabGroup.addTab({
      src: '',
      title: 'Downloads',
      isNative: true,
      iconURL: 'icon.png',
      comp: Settings,
      compProps: { calledBy: 'downloadpopup' }
    })
    newtab.activate()
  }
  selectOnFocus = event => event.target.select()
  render () {
    return (
      <>
        <div id='controls' className={this.state.isfullScreen ? 'd-none' : ''}>
          <button
            id='back'
            title='Go Back'
            onClick={this.goBack}
            disabled={!this.state.tabs[this.state.activeTab]?.canGoBack}
          >
            <i className='fas fa-chevron-left' />
          </button>
          <button
            id='forward'
            title='Go Forward'
            onClick={this.goForward}
            disabled={!this.state.tabs[this.state.activeTab]?.canGoForward}
          >
            <i className='fas fa-chevron-right' />
          </button>
          {/* <button id="home" onClick={this.goHome} title="Go Home"><i className="fas fa-home" /></button> */}
          <button
            id='reload'
            title='Reload'
            onClick={this.reloadWebv}
            disabled={this.state.istabWebview}
          >
            <i className='fas fa-redo' />
          </button>

          <form
            className='text-center'
            id='location-form'
            onSubmit={this.submitURL}
          >
            <div id='center-column'>
              <button className='urlInfo d-none'>
                {this.state.isSiteSecure ? (
                  <i className='fa fa-lock secure-site' />
                ) : (
                  <i className='fa fa-globe' />
                )}
              </button>
              <input
                id='location'
                type='text'
                spellCheck='false'
                ref={input => (this.inputField = input)}
                onFocus={this.selectOnFocus}
                onChange={this.handleChange}
                defaultValue={'loading'}
              />
            </div>
          </form>
          <DownloadPopup openDownloadsPage={this.openDownloadsPage} />
          <button
            id='menu'
            title='Options'
            className='p-0 m-0 fas fa-ellipsis-h'
            onClick={() => {
              let newtab = this.state.tabGroup.addTab({
                title: 'Settings',
                src: 'nex://settings',
                icon: 'fas fa-ellipsis-h',
                iconURL: 'icon.png',
                isNative: true,
                comp: Settings,
                compProps: { calledBy: 'menu' }
              })
              newtab.activate()
            }}
          ></button>
        </div>
      </>
    )
  }
}
export default Controls
