var Util, DOM, CloudCmd;

(function (Util, DOM) {
    'use strict';
    
     CloudCmd.Listeners = new ListenersProto(CloudCmd, Util, DOM);
     
     function ListenersProto(CloudCmd, Util, DOM) {
        var Info                = DOM.CurrentInfo,
            Storage             = DOM.Storage,
            Events              = DOM.Events,
            getConfig           = CloudCmd.getConfig;
        
        this.analytics          = function() {
            getConfig(function(config) {
                var analytics   = config.analytics,
                    online      = config.online;
                    
                if (analytics && online) {
                    Events.addOnce('mousemove', function() {
                        var FIVE_SECONDS    = 5000,
                            url             = CloudCmd.LIBDIRCLIENT + 'analytics.js';
                        
                        setTimeout(function() {
                            DOM.jsload(url);
                        }, FIVE_SECONDS);
                    });
                }
            });
        };
        
        this.init = function () {
            appStorage();
            contextMenu();
            dragndrop();
            unload();
            pop();
            online();
        };
        
        this.initKeysPanel          = function() {
            var button, id, func,
                keysElement     = DOM.getByClass('keyspanel');
            
            if (keysElement)
                Events.addClick(function(event) {
                    var element = event.target,
                        id      = element.id,
                        
                        clickFuncs      = {
                            'f1'        : CloudCmd.Help.show,
                            'f3'        : CloudCmd.View.show,
                            'f4'        : CloudCmd.Edit.show,
                            'f9'        : CloudCmd.Menu.show,
                            'f10'       : CloudCmd.Config.show,
                            '~'         : CloudCmd.Console.show,
                            'contact'   : CloudCmd.Contact.show,
                            
                            'f2'        : DOM.renameCurrent,
                            'f5'        : DOM.copyCurrent,
                            'f6'        : DOM.moveCurrent,
                            'f7'        : DOM.promptNewDir,
                            'f8'        : DOM.promptDelete
                        },
                        
                        func    = clickFuncs[id];
                    
                    Util.exec(func);
                    
                }, keysElement);
        };
        
        /**
         * функция меняет ссыки на ajax-овые 
         * @param panelId
         */
        this.changeLinks            = function(panelId) {
            var i, n, a, ai, current, link, loadDir, events, id, isDir,
                
                url             = CloudCmd.HOST,
                loadDirOnce     = CloudCmd.loadDir(),
                panel           = DOM.getById(panelId),
                pathElement     = DOM.getByDataName('js-path', panel),
                filesElement    = DOM.getByClass('files', panel),
                
                files           = filesElement.children,
                pathLinks       = DOM.getByClass('links', pathElement).children,
                clearStorage    = DOM.getByClass('clear-storage', pathElement),
                refresh         = DOM.getByDataName('js-refresh', pathElement),
                
                fileClick       = function (event) {
                    var ctrl = event.ctrlKey;
                    
                    if (!ctrl)
                        DOM.preventDefault(event);
                },
                
                onTouchEnd      = function(event) {
                    setCurrentFile(event);
                    loadDirOnce(event);
                };
            
            /* ставим загрузку гифа на клик*/
            Events.addClick(function(event) {
                CloudCmd.refresh();
                event.preventDefault();
            }, refresh);
            
            Events.addClick(Storage.clear, clearStorage);
            
            n = pathLinks.length;
            for (i = 0; i < n; i++) {
                ai          = pathLinks[i];
                link        = Util.removeStr(ai.href, url),
                loadDir     = CloudCmd.loadDir(link),
                
                Events.addClick(loadDir, ai);
            }
            
            a = DOM.getByTag('a', filesElement);
            
            n = a.length;
            for (i = 0; i < n ; i++) {
                current     = files[i];
                isDir       = DOM.isCurrentIsDir(current);
                ai          = a[i];
                
                if (ai.title)
                    id      = ai.title;
                else
                    id      = ai.textContent;
                
                id          += '(' + panelId + ')';
                
                current.id  = id;
                
                if (!isDir)
                    events  = {
                        'click'     : fileClick
                    };
                else
                    events = {
                        'dblclick'  : loadDirOnce,
                        'touchend'  : onTouchEnd,
                        'click'     : DOM.preventDefault,
                    };
                
                Util.copyObj(events, {
                    'mousedown'     : setCurrentFile,
                    'contextmenu'   : onContextMenu,
                    'dragstart'     : onDragStart
                });
                
                Events.add(events, current);
            }
        };
        
        function onContextMenu(event) {
            var target,
                isFunc      = Util.isFunction(CloudCmd.Menu),
                ret         = true,
                Key         = CloudCmd.Key;
            
            /* getting html element
             * currentTarget - DOM event
             * target        - jquery event
             */
            target = event.currentTarget || event.target;
            DOM.setCurrentFile(target);
            
            if (isFunc) {
                CloudCmd.Menu({
                    x: event.clientX,
                    y: event.clientY
                });
                
                /* disabling browsers menu*/
                ret = false;
            }
            
            return ret;
        }
        
         /* 
          * download file from browser to desktop
          * in Chrome (HTML5)
          */
        function onDragStart(event) {
            var element     = event.target,
                EXT         = 'json',
                isDir       = Info.isDir,
                link        = element.href,
                name        = element.textContent;
            
            /* if it's directory - adding json extension */
            if (isDir) {
                name       += '.' + EXT;
                link       += '?' + EXT;
            }
            
            event.dataTransfer.setData('DownloadURL',
                'application/octet-stream'  + ':' +
                name                        + ':' + 
                link);
        }
        
        function setCurrentFile(event) {
            var element     = event.target,
                tag         = element.tagName;
            
            if (tag !== 'LI')
                do {
                    element     = element.parentElement;
                    tag         = element.tagName;
                } while(tag !== 'LI');
            
            DOM.setCurrentFile(element);
        }
        
        function appStorage() {
            getConfig(function(config) {
                var isAppStorage  = config.appStorage,
                    appStorage    = window.applicationStorage;
                
                if (isAppStorage && appStorage)
                    Events.add('updateready', function() {
                        var ret = confirm('An update is available. Reload now?');
                        
                        if (ret)
                            location.reload();
                    
                    }, appStorage);
                });
        }
        
        function contextMenu() {
            Events.addContextMenu(function(pEvent) {
                CloudCmd.Menu.ENABLED || DOM.preventDefault(pEvent);
            }, document);
        }
        
        function dragndrop() {
            var panels          = DOM.getByClassAll('panel'),
                i               = 0,
                n               = panels.length,
                preventDefault  = function (event) {
                    event.stopPropagation();
                    event.preventDefault();
                },
                toggle          = function () {
                    for (i = 0; i < n; i++)
                        DOM.toggleClass(panels[i], 'selected-panel');
                },
                onDrop          = function (event) {
                    var reader, file, files,
                         dir    = Info.dirPath,
                         load   = function(file) {
                            return function(event) {
                                var path    = dir + file.name,
                                    data    = event.target.result;
                                
                                DOM.RESTful.write(path, data, CloudCmd.refresh);
                            };
                        };
                    
                    preventDefault(event);
                    toggle();
                    
                    files               = event.dataTransfer.files;
                    
                    if (files.length) {
                        n               = files.length;
                        
                        for (i = 0; i < n; i++) {
                            reader          = new FileReader();
                            file            = files[i];
                            Events.add('load', load(file), reader);
                            reader.readAsArrayBuffer(file);
                        }
                    }
                };
                
            Events.add(['dragenter', 'dragleave'], toggle);
            
            for (i = 0; i < n; i++) {
                Events.add('dragover', preventDefault, panels[i]);
                Events.add('drop', onDrop, panels[i]);
            }
        }
        
        function unload() {
            DOM.Events.add(['unload', 'beforeunload'], function (pEvent) {
                var lRet, 
                    Key     = CloudCmd.Key,
                    lIsBind = Key && Key.isBind();
                
                if (!lIsBind) {
                    DOM.preventDefault(pEvent);
                    lRet = 'Please make sure that you saved all work.';
                }
                
                return lRet;
            });
        }
        
        function pop() {
            Events.add("popstate", function(event) {
                var path;
                
                if (!event.state)
                    CloudCmd.route(location.hash);
                else {
                    path   = event.state + '?json';
                    CloudCmd.ajaxLoad(path, {
                        nohistory: true
                    });
                }
            });
        }
        
        function online() {
            var cssSet = DOM.cssSet.bind(null, {
                    id      :'local-droids-font',
                    element : document.head,
                    inner   :   '@font-face {font-family: "Droid Sans Mono";'           +
                                'font-style: normal;font-weight: normal;'               +
                                'src: local("Droid Sans Mono"), local("DroidSansMono"),'+
                                ' url("/font/DroidSansMono.woff") format("woff");}'
                });
            
            if (navigator.onLine)
                Events.addOnce('offline', cssSet);
            else
                cssSet();
        }
        
     }
    
})(Util, DOM);
