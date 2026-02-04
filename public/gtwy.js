/* eslint-disable */
// IIFE Scope (optimized for performance and size)
(function () {
    class GtwyEmbedManager {
        constructor() {
            this.props = {};
            this.parentContainer = null;
            this.scriptIds = {};
            this.config = {
                height: '100', heightUnit: 'vh', width: '100', widthUnit: 'vw',
                buttonName: '', slide: 'full', hideCloseButton: 'false',
                hideFullScreenButton: 'false', hideHeader: 'false', skipLoadGtwy: false
            };
            this.urls = {
                gtwyUrl: 'https://embed.gtwy.ai/embed',
                login: 'https://db.gtwy.ai/api/embed/login'
            };
            this.state = {
                bodyLoaded: false, fullscreen: false, isInitialized: false, hasParentContainer: false,
                tempDataToSend: {}
            };
            this.initializeEventListeners();
        }

        extractScriptProps() {
            const script = document.getElementById('gtwy-user-script') || document.getElementById('gtwy-main-script');
            if (!script) return {};

            const attrs = ['embedToken', 'hideCloseButton', 'parentId', 'hideFullScreenButton', 'hideHeader', 'defaultOpen', 'slide', 'agent_id', 'agent_name', 'version_id', 'token', 'gtwy_user', 'org_id', 'skipLoadGtwy', 'customIframeId'];
            return attrs.reduce((props, attr) => {
                if (script.hasAttribute(attr)) {
                    let value = script.getAttribute(attr);
                    
                    if (['config', 'headerButtons', 'eventsToSubscribe'].includes(attr)) {
                        try { value = JSON.parse(value); } catch (e) { console.error(`Error parsing ${attr}:`, e); }
                    }
                    
                    if (attr === 'defaultOpen') this.config.defaultOpen = value || false;
                    if (attr === 'slide' && ['full', 'left', 'right'].includes(value)) this.config.slide = value;
                    if (attr === 'skipLoadGtwy') this.config.skipLoadGtwy = value === 'true' || value === true;
                    if (['hideHeader', 'hideCloseButton', 'hideFullScreenButton'].includes(attr)) this.config[attr] = value;
                    
                    props[attr] = value;
                    this.state.tempDataToSend = { ...this.state.tempDataToSend, [attr]: value };
                }
                return props;
            }, {});
        }

        initializeEventListeners() {
            new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.tagName === 'SCRIPT' && ['gtwy-user-script', 'gtwy-main-script'].includes(node.id)) {
                                this.props = this.extractScriptProps();
                            }
                        });
                        mutation.removedNodes.forEach(node => {
                            if (node.tagName === 'SCRIPT' && ['gtwy-user-script', 'gtwy-main-script'].includes(node.id)) {
                                this.cleanupGtwyEmbed();
                            }
                        });
                    }
                });
            }).observe(document.head, { childList: true });

            window.addEventListener('message', event => {
                const { type } = event.data || {};
                switch (type) {
                    case 'CLOSE_GTWY_EMBED':
                    case 'CLOSE_GTWY':
                        this.closeGtwy();
                        break;
                    case 'gtwyLoaded':
                    case 'configLoaded':
                        this.sendInitialData();
                        break;
                }
            });
        }

        cleanupGtwyEmbed() {
            ['gtwy-iframe-parent-container', 'gtwyInterfaceEmbed', 'gtwyEmbed-style', 'gtwy-embed-header']
                .forEach(id => document.getElementById(id)?.remove());
        }

        createEmbedHeader() {
            if (this.state.hasParentContainer) return null;

            const header = document.createElement('div');
            header.id = 'gtwy-embed-header';
            header.className = 'gtwy-embed-header';
            header.style.cssText = 'background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(10px);';

            const headerContent = document.createElement('div');
            headerContent.className = 'gtwy-header-content';

            const poweredBy = document.createElement('a');
            poweredBy.className = 'gtwy-powered-by';
            Object.assign(poweredBy, {
                href: 'https://gtwy.ai',
                target: '_blank',
                rel: 'noopener noreferrer'
            });
            poweredBy.style.textDecoration = 'none';
            poweredBy.innerHTML = `<span style="color: #ccc; font-size: 12px; margin-right: 6px; font-weight: 300;">Powered by</span><span style="color: #fff; font-weight: 500; font-size: 12px;">GTWY AI</span>`;

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'gtwy-header-buttons';

            const createButton = (id, className, title, svg, clickHandler) => {
                const btn = document.createElement('button');
                Object.assign(btn, { id, className, title, innerHTML: svg });
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    clickHandler();
                });
                return btn;
            };

            const fullscreenBtn = createButton(
                'gtwy-fullscreen-btn',
                'gtwy-header-btn gtwy-fullscreen-btn',
                'Toggle Fullscreen',
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
                () => this.toggleFullscreen(!this.state.fullscreen)
            );

            const closeBtn = createButton(
                'gtwy-close-btn',
                'gtwy-header-btn gtwy-close-btn',
                'Close Embed',
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
                () => this.closeGtwy()
            );

            buttonsContainer.append(fullscreenBtn, closeBtn);
            headerContent.append(poweredBy, buttonsContainer);
            header.appendChild(headerContent);

            return header;
        }

        addStyles() {
            if (document.getElementById('gtwy-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'gtwy-styles';
            style.textContent = `
                .gtwy-embed-header {
                    position: absolute; top: 0; left: 0; right: 0; height: 50px;
                    background: #808080; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    z-index: 10000; display: flex; align-items: center; justify-content: space-between;
                    padding: 0 16px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); backdrop-filter: blur(10px);
                }
                .gtwy-header-content { display: flex; align-items: center; justify-content: space-between; width: 100%; }
                .gtwy-header-buttons { display: flex; gap: 8px; align-items: center; }
                .gtwy-header-btn {
                    display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
                    border: none; border-radius: 6px; background: rgba(255, 255, 255, 0.1);
                    color: white; cursor: pointer; transition: all 0.2s ease; backdrop-filter: blur(10px);
                }
                .gtwy-header-btn:hover { background: rgba(255, 255, 255, 0.2); transform: translateY(-1px); }
                .gtwy-header-btn:active { transform: translateY(0); background: rgba(255, 255, 255, 0.15); }
                .gtwy-fullscreen-btn.fullscreen { background: rgba(255, 255, 255, 0.2); }
                .gtwy-close-btn:hover { background: rgba(255, 59, 48, 0.8); }
                #gtwy-iframe-parent-container.with-header #iframe-component-gtwyInterfaceEmbed { margin-top: 50px; height: calc(100% - 50px); }
                #gtwy-iframe-parent-container.parent-container #iframe-component-gtwyInterfaceEmbed { margin-top: 0; height: 100%; }
                .slide-left, .slide-right, .slide-full {
                    position: fixed !important; z-index: 9999 !important; max-height: 98vh !important;
                    transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out !important;
                }
                .slide-left { left: 0 !important; top: 0 !important; width: 999px !important; transform: translateX(-100%) !important; }
                .slide-left.open { transform: translateX(0) !important; }
                .slide-right { right: 0 !important; top: 0 !important; width: 999px !important; transform: translateX(100%) !important; }
                .slide-right.open { transform: translateX(0) !important; }
                .slide-full { top: 0 !important; left: 0 !important; width: 100vw !important; opacity: 0 !important; }
                .slide-full.open { opacity: 1 !important; }
            `;
            document.head.appendChild(style);
        }

        applySlideStyles(slideType) {
            if (this.state.hasParentContainer) return;
            
            const container = document.getElementById('gtwy-iframe-parent-container');
            if (!container) return;

            container.classList.remove('slide-left', 'slide-right', 'slide-full');
            container.classList.add(`slide-${slideType}`);
            this.addStyles();
        }
        openGtwy(agent_id = null, meta = {}, agent_name = null, agent_purpose = null,history=null) {
            if (!this.state.isInitialized) {
                this.initializeGtwyEmbed().then(() => this.openGtwy());
                return;
            }
            const dataToSend = {};
            if (agent_id) dataToSend.agent_id = agent_id;
            if (meta && Object.keys(meta).length > 0) dataToSend.meta = meta;
            if (agent_name) dataToSend.agent_name = agent_name;
            if (agent_purpose) dataToSend.agent_purpose = agent_purpose;
            if (history) dataToSend.history = history;
            
            if (Object.keys(dataToSend).length > 0) {
                SendDataToGtwyEmbed(dataToSend);
            }
            const container = document.getElementById('gtwy-iframe-parent-container');
            const iframe = document.getElementById('gtwyInterfaceEmbed');

            if (container) {
                if (iframe) iframe.style.display = 'none';
                container.style.display = 'block';

                if (!this.state.hasParentContainer) {
                    const slideType = this.props?.slide || this.config.slide || 'full';
                    this.applySlideStyles(slideType);
                    requestAnimationFrame(() => container.classList.add('open'));
                }
                window.parent?.postMessage?.({ type: 'openGtwy', data: {} }, '*');
            }
            setTimeout(()=>{
                sendMessageToGtwy({ type: 'openGtwy', data: {} })
            },4000)
        }

        closeGtwy() {
            const container = document.getElementById('gtwy-iframe-parent-container');
            if (container?.style?.display === 'block') {
                if (!this.state.hasParentContainer) container.classList.remove('open');
                window.parent?.postMessage?.({ type: 'closeGtwy', data: {} }, '*');
                const delay = this.state.hasParentContainer ? 0 : 300;
                setTimeout(() => {
                    window.parent?.postMessage?.({ type: 'close', data: {} }, '*');
                    container.style.display = 'none';
                }, delay);
            }
        }

        toggleFullscreen(enable) {
            if (this.state.hasParentContainer || this.state.fullscreen === enable) return;

            this.state.fullscreen = enable;
            const container = document.getElementById('gtwy-iframe-parent-container');
            const btn = document.getElementById('gtwy-fullscreen-btn');

            if (container) {
                container.style.transition = 'width 0.3s ease-in-out, height 0.3s ease-in-out';

                if (enable) {
                    Object.assign(container.style, { width: '100vw', maxHeight: '98vh' });
                    container.classList.add('full-screen-without-border', 'slide-full');
                    if (btn) {
                        btn.classList.add('fullscreen');
                        btn.title = 'Exit Fullscreen';
                        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
                    }
                } else {
                    container.classList.remove('full-screen-without-border', 'slide-full');
                    if (btn) {
                        btn.classList.remove('fullscreen');
                        btn.title = 'Toggle Fullscreen';
                        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
                    }
                    const { height = this.config.height, heightUnit = this.config.heightUnit, width = this.config.width, widthUnit = this.config.widthUnit } = this.props?.config || {};
                    Object.assign(container.style, { maxHeight: `${height}${heightUnit}`, width: `${width}${widthUnit}` });
                }
            }
        }

        async initializeGtwyEmbed() {
            return new Promise(resolve => {
                const init = () => {
                    if (!this.state.bodyLoaded) {
                        this.loadContent();
                        this.state.isInitialized = true;
                    }
                    resolve();
                };
                document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
            });
        }

        loadContent() {
            if (this.state.bodyLoaded) return;
            this.extractScriptProps();
            this.createIframeContainer();
            
            if (!this.config.skipLoadGtwy && !this.state.tempDataToSend?.gtwy_user) {
                this.loadGtwyEmbed();
            } else {
                this.createCustomIframe();
            }
            
            this.updateProps(this.state.tempDataToSend || {});
            this.state.bodyLoaded = true;
        }

        createCustomIframe() {
            const iframe = document.getElementById('iframe-component-gtwyInterfaceEmbed');
            if (!iframe) return;

            if (this.state.tempDataToSend?.gtwy_user === 'true') {
                const customId = this.scriptIds.customIframeId || this.props.customIframeId;
                if (customId) {
                    window.open(customId, '_blank', 'noopener,noreferrer');
                    this.closeGtwy();
                    return;
                }
            }

            const customId = this.scriptIds.customIframeId || this.props.customIframeId;
            iframe.src = customId || `${this.urls.gtwyUrl}?interfaceDetails=${encodeURIComponent(JSON.stringify(this.state.tempDataToSend))}`;
            
            this.applyConfig(this.config);
            if (this.state.isInitialized) {
                window.postMessage({ type: 'configLoaded', data: this.props.config }, '*');
            }
        }

        createIframeContainer() {
            this.parentContainer = document.createElement('div');
            const customId = this.scriptIds.customContainerId || 'gtwy-iframe-parent-container';
            this.parentContainer.id = customId;

            const parentId = this.props.parentId || this.state.tempDataToSend?.parentId || '';
            this.state.hasParentContainer = !!parentId && !!document.getElementById(parentId);

            this.parentContainer.className = this.state.hasParentContainer ? 'popup-parent-gtwy-container parent-container' : 'popup-parent-gtwy-container with-header';
            Object.assign(this.parentContainer.style, { display: 'none', position: 'relative' });

            if (!this.state.hasParentContainer) {
                const header = this.createEmbedHeader();
                if (header) {
                    this.addStyles();
                    this.parentContainer.appendChild(header);
                    header.style.display = ['true', true].includes(this.config.hideHeader) ? 'none' : 'block';
                }
            }

            const iframe = document.createElement('iframe');
            const iframeId = this.scriptIds.customIframeId || 'iframe-component-gtwyInterfaceEmbed';
            Object.assign(iframe, {
                id: iframeId,
                title: 'iframe',
                sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms',
                allow: 'clipboard-read *; clipboard-write *; microphone *; camera *; midi *; encrypted-media *'
            });
            Object.assign(iframe.style, { width: '100%', height: '100%', border: 'none' });

            if (!this.state.hasParentContainer) {
                const hideHeader = ['true', true].includes(this.config.hideHeader);
                Object.assign(iframe.style, {
                    marginTop: hideHeader ? '0vh' : '5vh',
                    maxHeight: hideHeader ? '100vh' : '95vh'
                });
            }

            this.parentContainer.appendChild(iframe);
            this.changeContainer(parentId, this.parentContainer);
        }

        changeContainer(parentId, container = this.parentContainer) {
            this.state.hasParentContainer = !!parentId && !!document.getElementById(parentId);

            if (this.state.hasParentContainer) {
                const parent = document.getElementById(parentId);
                parent.style.position = 'relative';
                Object.assign(container.style, {
                    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', minHeight: 'unset'
                });
                container.className = 'popup-parent-gtwy-container parent-container';
                parent.appendChild(container);
            } else {
                Object.assign(container.style, { position: 'fixed', maxHeight: '100vh' });
                container.className = 'popup-parent-gtwy-container with-header';
                (document.getElementById('interface-gtwy-embed') || document.body).appendChild(container);
            }
        }

        async loadGtwyEmbed() {
            try {
                const response = await this.fetchGtwyDetails();
                if (!response || response.error || !response.data) {
                    console.error('Login failed, not loading embed:', response);
                    this.handleLoginFailure();
                    return;
                }
                this.processGtwyDetails(response);
            } catch (error) {
                console.error('GTWY embed loading error:', error);
                this.handleLoginFailure();
            }
        }

        async fetchGtwyDetails() {
            try {
                const embedToken = document.getElementById('gtwy-main-script')?.getAttribute('embedToken');
                const options = embedToken ? {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: embedToken }
                } : undefined;
                const response = await fetch(this.urls.login, options);
                if (!response.ok) {
                    throw new Error(`Login API failed with status: ${response.status}`);
                }
                return response.json();
            } catch (error) {
                console.error('Fetch login user error:', error);
                throw error; // Re-throw to be caught by loadGtwyEmbed
            }
        }
        handleLoginFailure() {
            console.error('Login failed, preventing embed from opening');
            this.cleanupGtwyEmbed();
            this.state.isInitialized = false;
            this.state.bodyLoaded = false;
        }

        processGtwyDetails(data) {
            const iframe = document.getElementById('iframe-component-gtwyInterfaceEmbed');
            if (!iframe) return;

            const tempData = { ...data.data };
            if (this.state.tempDataToSend?.agent_id) tempData.agent_id = this.state.tempDataToSend.agent_id;
            if (this.state.tempDataToSend?.agent_name) tempData.agent_name = this.state.tempDataToSend.agent_name;
            
            iframe.src = `${this.urls.gtwyUrl}?interfaceDetails=${encodeURIComponent(JSON.stringify(tempData))}`;
            this.config = { ...this.config, ...(data?.data?.config || {}) };
            this.applyConfig(this.config);
            
            if (this.state.isInitialized) {
                window.postMessage({ type: 'configLoaded', data: this.props.config }, '*');
            }
        }

        applyConfig(config = {}) {
            const container = document.getElementById('gtwy-iframe-parent-container');
            if (!container) return;

            if (config && Object.keys(config).length > 0) {
                ['hideCloseButton', 'hideFullScreenButton'].forEach(key => {
                    if (key in config) {
                        this.config[key] = config[key];
                        const btn = document.getElementById(key === 'hideCloseButton' ? 'gtwy-close-btn' : 'gtwy-fullscreen-btn');
                        if (btn) btn.style.display = [true, 'true'].includes(config[key]) ? 'none' : 'flex';
                    }
                });

                if ('hideHeader' in config &&  !this.state.hasParentContainer) {
                    this.config.hideHeader = config.hideHeader;
                    const header = document.getElementById('gtwy-embed-header');
                    const iframe = document.getElementById('iframe-component-gtwyInterfaceEmbed');
                    const hide = [true, 'true'].includes(config.hideHeader);
                    
                    if (header) header.style.display = hide ? 'none' : 'flex';
                    if (iframe) {
                        Object.assign(iframe.style, {
                            marginTop: hide ? '0px' : '5vh',
                            maxHeight: hide ? '100vh' : '95vh'
                        });
                    }
                    container.classList.toggle('with-header', !hide);
                }

                if (config.slide) this.props.slide = config.slide;
            }

            if (!this.state.hasParentContainer) {
                const { height = this.config.height, heightUnit = this.config.heightUnit, width = this.config.width, widthUnit = this.config.widthUnit } = config;
                Object.assign(container.style, {
                    height: `${height}${heightUnit}`,
                    width: `${width}${widthUnit}`,
                    minHeight: '100vh'
                });
            }
        }

        updateProps(newProps) {
            this.props = { ...this.props, ...newProps };
            this.setPropValues(newProps);
        }

        setPropValues(props) {
            if ([true, 'true'].includes(props.fullScreen)) {
                document.getElementById('gtwy-iframe-parent-container')?.classList.add('full-screen-gtwyInterfaceEmbed');
                this.state.tempDataToSend = { ...this.state.tempDataToSend, hideFullScreenButton: true };
                sendMessageToGtwy({ type: 'gtwyInterfaceData', data: { hideFullScreenButton: true } });
            }
            if ('slide' in props) this.props.slide = props.slide;
        }

        sendInitialData() {
            setTimeout(() => {
                if (this.state.tempDataToSend) {
                    sendMessageToGtwy({ type: 'gtwyInterfaceData', data: this.state.tempDataToSend });
                    const shouldOpen = [this.state.tempDataToSend?.defaultOpen, this.state.config?.defaultOpen, this.config.defaultOpen]
                        .some(val => [true, 'true'].includes(val));
                    if (shouldOpen) this.openGtwy();
                    this.state.tempDataToSend = null;
                }
            }, 1000);
        }
    }

    const gtwyEmbedManager = new GtwyEmbedManager();

    const SendDataToGtwyEmbed = function (dataToSend) {
        if (typeof dataToSend === 'string') {
            try { dataToSend = JSON.parse(dataToSend); } 
            catch (e) { console.error('Failed to parse dataToSend:', e); return; }
        }

        if ('parentId' in dataToSend) {
            gtwyEmbedManager.state.tempDataToSend = { ...gtwyEmbedManager.state.tempDataToSend, ...dataToSend };
            const prevParentId = gtwyEmbedManager.props['parentId'];
            const existingParent = document.getElementById(prevParentId);

            if (existingParent?.contains(gtwyEmbedManager.parentContainer)) {
                if (prevParentId !== dataToSend.parentId) {
                    if (prevParentId && existingParent?.contains(gtwyEmbedManager.parentContainer)) {
                        existingParent.removeChild(gtwyEmbedManager.parentContainer);
                    } else if (document.body.contains(gtwyEmbedManager.parentContainer)) {
                        document.body.removeChild(gtwyEmbedManager.parentContainer);
                    }
                    gtwyEmbedManager.updateProps({ parentId: dataToSend.parentId });
                    gtwyEmbedManager.changeContainer(dataToSend.parentId || '');
                }
            } else {
                gtwyEmbedManager.updateProps({ parentId: dataToSend.parentId });
                gtwyEmbedManager.changeContainer(dataToSend.parentId || '');
            }
        }

        const propsToUpdate = {};
        if ('hideCloseButton' in dataToSend) propsToUpdate.hideCloseButton = dataToSend.hideCloseButton || false;
        if (['true', 'false', true, false].includes(dataToSend.fullScreen)) propsToUpdate.fullScreen = dataToSend.fullScreen;
        if ('slide' in dataToSend) propsToUpdate.slide = dataToSend.slide;

        if (Object.keys(propsToUpdate).length > 0) gtwyEmbedManager.updateProps(propsToUpdate);

        const iframe = document.getElementById('iframe-component-gtwyInterfaceEmbed');
        if (iframe?.contentWindow && dataToSend) {
            gtwyEmbedManager.state.tempDataToSend = { ...gtwyEmbedManager.state.tempDataToSend, ...dataToSend };
            sendMessageToGtwy({ type: 'gtwyInterfaceData', data: dataToSend });
        }

        if ('config' in dataToSend && dataToSend.config) {
            const newConfig = { ...gtwyEmbedManager.config, ...dataToSend.config };
            gtwyEmbedManager.applyConfig(newConfig);
            gtwyEmbedManager.updateProps({ config: newConfig });
        }
    };

    // Global API
    window.openGtwy = ({ agent_id = "", meta = {}, agent_name = "", agent_purpose = "", history = null } = {}) => {
        gtwyEmbedManager.openGtwy(agent_id, meta, agent_name, agent_purpose, history);
    };
    window.closeGtwy = () => gtwyEmbedManager.closeGtwy();

    window.GtwyEmbed = {
        open: () => gtwyEmbedManager.openGtwy(),
        close: () => gtwyEmbedManager.closeGtwy(),
        show: () => { const el = document.getElementById('iframe-component-gtwyInterfaceEmbed'); if (el) el.style.display = 'unset'; },
        hide: () => { const el = document.getElementById('iframe-component-gtwyInterfaceEmbed'); if (el) el.style.display = 'none'; },
        sendDataToGtwy: SendDataToGtwyEmbed,
        toggleFullscreen: () => gtwyEmbedManager.toggleFullscreen(!gtwyEmbedManager.state.fullscreen),
        enterFullscreen: () => gtwyEmbedManager.toggleFullscreen(true),
        exitFullscreen: () => gtwyEmbedManager.toggleFullscreen(false)
    };

    function sendMessageToGtwy(messageObj) {
        const iframe = document.getElementById('iframe-component-gtwyInterfaceEmbed');
        iframe?.contentWindow?.postMessage({ type: 'gtwyMessage', data: messageObj }, '*');
    }

    gtwyEmbedManager.initializeGtwyEmbed();
})();
