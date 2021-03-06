(function() {
    'use strict';
    
    var main            = global.cloudcmd.main,
        DIR             = main.DIR,
        socket          = main.socket,
        spawn           = main.child_process.spawn,
        pty             = main.require('pty.js'),
        
        Util            = main.util,
        path            = main.path,
        CloudFunc       = main.cloudfunc,
        
        mainpackage     = main.mainpackage,
        CLOUDCMD        = mainpackage.name,
        ClientDirs      = [],
        Clients         = [],
        WIN32           = main.WIN32,
        
        CHANNEL         = CloudFunc.CHANNEL_TERMINAL,
        CHANNEL_RESIZE  = CloudFunc.CHANNEL_TERMINAL_RESIZE,
        
        ConNum          = 0,
        
        INFO            = 'to use terminal install pty.js: npm i pty.js';
        
    /**
     * function listen on servers port
     * @pServer {Object} started server object
     */
    exports.init = function() {
        var ret, func,
            makePty     = function(clientSocket) {
                onConnection(clientSocket, function(channel, data) {
                    socket.emit(channel, data, clientSocket);
                });
            },
            
            sendInfo    = function(clientSocket) {
                Util.log(INFO);
                socket.emit(CHANNEL, INFO, clientSocket);
            };
        
        if (pty)
            func        =  makePty;
        else
            func        = sendInfo;
        
        ret = socket.on('connection', func);
        
        return ret;
    };
    
    function onConnection(clientSocket, callback) {
        var msg, onDisconnect, resizeFunc, dataFunc, term;
        
        ++ConNum;
        
        if (!Clients[ConNum]) {
            log(ConNum, 'terminal connected');
            
            term                        = getTerm(callback);
            dataFunc                    = onData.bind(null, term);
            resizeFunc                  = onResize.bind(null, term, callback);
            
            onDisconnect                = function(conNum, term) {
                Clients[conNum]         = null;
                
                log(conNum, 'terminal disconnected');
                
                socket.removeListener(CHANNEL, dataFunc, clientSocket);
                socket.removeListener(CHANNEL_RESIZE, resizeFunc, clientSocket);
                socket.removeListener('disconnect', onDisconnect, clientSocket);
                
                term.destroy();
            }.bind(null, ConNum, term);
            
            socket.on(CHANNEL, dataFunc, clientSocket);
            socket.on(CHANNEL_RESIZE, resizeFunc, clientSocket);
            socket.on('disconnect', onDisconnect, clientSocket);
        } else {
            log(ConNum, ' in use. Reconnecting...\n');
            socket.disconnect();
        }
    }
    
    function onResize(term, callback, size) {
        term.resize(size.cols, size.rows);
        Util.exec(callback, CHANNEL_RESIZE, size);
    }
    
    function onData(term, data) {
        term.write(data);
    }
    
    function getTerm(callback) {
        var onData      = Util.exec.bind(Util, callback, CHANNEL),
            
            term        = pty.spawn('bash', [], {
                name: 'xterm-color',
                cols: 80,
                rows: 25,
                cwd : DIR,
                env : process.env
            });
        
        term.on('data', onData);
        
        return term;
    }
    
    function log(pConnNum, pStr, pType) {
        var lRet, 
            lType       = ' ';
        
        if (pStr) {
            
            if (pType)
                lType  += pType + ':';
            
            lRet        = 'client #' + pConnNum + lType + pStr;
            
            Util.log(lRet);
        }
        
        return lRet;
    }
})();
