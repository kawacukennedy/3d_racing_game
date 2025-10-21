export class VoiceChatManager {
    constructor(networkManager) {
        this.networkManager = networkManager;
        this.isEnabled = false;
        this.isMuted = false;
        this.audioContext = null;
        this.localStream = null;
        this.peers = new Map(); // peerId -> { connection, audioElement, gainNode }
        this.localGainNode = null;
        this.masterVolume = 0.8;
        this.pushToTalk = false;
        this.pttKey = 'KeyT'; // T key for push-to-talk

        this.initializeAudioContext();
        this.setupNetworkHandlers();
    }

    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.localGainNode = this.audioContext.createGain();
            this.localGainNode.connect(this.audioContext.destination);
            this.localGainNode.gain.value = this.masterVolume;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    setupNetworkHandlers() {
        // Handle new players joining
        this.networkManager.setVoiceChatCallback((event, data) => {
            switch (event) {
                case 'playerJoined':
                    this.handlePlayerJoined(data.playerId);
                    break;
                case 'playerLeft':
                    this.handlePlayerLeft(data.playerId);
                    break;
                case 'voiceOffer':
                    this.handleVoiceOffer(data.from, data.offer);
                    break;
                case 'voiceAnswer':
                    this.handleVoiceAnswer(data.from, data.answer);
                    break;
                case 'voiceIceCandidate':
                    this.handleIceCandidate(data.from, data.candidate);
                    break;
                case 'voiceMuteStatus':
                    this.handleMuteStatus(data.playerId, data.muted);
                    break;
            }
        });
    }

    async enableVoiceChat() {
        if (this.isEnabled) return;

        try {
            // Request microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            });

            // Create source node for local audio monitoring
            const source = this.audioContext.createMediaStreamSource(this.localStream);
            source.connect(this.localGainNode);

            this.isEnabled = true;
            console.log('Voice chat enabled');

            // Connect to existing players
            this.connectToAllPlayers();

        } catch (error) {
            console.error('Failed to enable voice chat:', error);
            alert('Microphone access denied. Voice chat will be disabled.');
        }
    }

    disableVoiceChat() {
        if (!this.isEnabled) return;

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Disconnect from all peers
        this.peers.forEach(peer => {
            this.disconnectPeer(peer.peerId);
        });
        this.peers.clear();

        this.isEnabled = false;
        console.log('Voice chat disabled');
    }

    async connectToAllPlayers() {
        if (!this.isEnabled) return;

        const players = this.networkManager.getPlayers();
        for (const player of players) {
            if (player.id !== this.networkManager.playerId) {
                await this.connectToPeer(player.id);
            }
        }
    }

    async connectToPeer(peerId) {
        if (!this.isEnabled || this.peers.has(peerId)) return;

        try {
            const peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // Add local stream tracks
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });

            // Handle remote stream
            peerConnection.ontrack = (event) => {
                this.handleRemoteStream(peerId, event.streams[0]);
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.networkManager.sendVoiceIceCandidate(peerId, event.candidate);
                }
            };

            // Create offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Send offer to peer
            this.networkManager.sendVoiceOffer(peerId, offer);

            // Store peer connection
            this.peers.set(peerId, {
                peerId,
                connection: peerConnection,
                audioElement: null,
                gainNode: null,
                muted: false
            });

        } catch (error) {
            console.error(`Failed to connect to peer ${peerId}:`, error);
        }
    }

    handleRemoteStream(peerId, stream) {
        const peer = this.peers.get(peerId);
        if (!peer) return;

        // Create audio element
        const audioElement = new Audio();
        audioElement.srcObject = stream;
        audioElement.volume = this.masterVolume;
        audioElement.play().catch(console.error);

        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.masterVolume;

        peer.audioElement = audioElement;
        peer.gainNode = gainNode;

        console.log(`Remote audio stream received from ${peerId}`);
    }

    async handleVoiceOffer(from, offer) {
        if (!this.isEnabled) return;

        try {
            const peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // Add local stream tracks
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });

            // Handle remote stream
            peerConnection.ontrack = (event) => {
                this.handleRemoteStream(from, event.streams[0]);
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.networkManager.sendVoiceIceCandidate(from, event.candidate);
                }
            };

            // Set remote description
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            // Create answer
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            // Send answer
            this.networkManager.sendVoiceAnswer(from, answer);

            // Store peer connection
            this.peers.set(from, {
                peerId: from,
                connection: peerConnection,
                audioElement: null,
                gainNode: null,
                muted: false
            });

        } catch (error) {
            console.error(`Failed to handle voice offer from ${from}:`, error);
        }
    }

    async handleVoiceAnswer(from, answer) {
        const peer = this.peers.get(from);
        if (!peer) return;

        try {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error(`Failed to handle voice answer from ${from}:`, error);
        }
    }

    async handleIceCandidate(from, candidate) {
        const peer = this.peers.get(from);
        if (!peer) return;

        try {
            await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error(`Failed to add ICE candidate from ${from}:`, error);
        }
    }

    handlePlayerJoined(playerId) {
        if (this.isEnabled) {
            this.connectToPeer(playerId);
        }
    }

    handlePlayerLeft(playerId) {
        this.disconnectPeer(playerId);
    }

    disconnectPeer(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer) return;

        // Close connection
        if (peer.connection) {
            peer.connection.close();
        }

        // Stop audio
        if (peer.audioElement) {
            peer.audioElement.pause();
            peer.audioElement.srcObject = null;
        }

        this.peers.delete(peerId);
        console.log(`Disconnected from peer ${peerId}`);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }

        // Notify other players
        this.networkManager.sendVoiceMuteStatus(this.isMuted);

        return this.isMuted;
    }

    handleMuteStatus(playerId, muted) {
        const peer = this.peers.get(playerId);
        if (!peer) return;

        peer.muted = muted;

        // Update audio volume/gain
        if (peer.gainNode) {
            peer.gainNode.gain.value = muted ? 0 : this.masterVolume;
        }
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));

        // Update local gain
        if (this.localGainNode) {
            this.localGainNode.gain.value = this.masterVolume;
        }

        // Update all peer gains
        this.peers.forEach(peer => {
            if (peer.gainNode) {
                peer.gainNode.gain.value = peer.muted ? 0 : this.masterVolume;
            }
        });
    }

    setPushToTalk(enabled) {
        this.pushToTalk = enabled;
        if (enabled) {
            this.setupPushToTalk();
        } else {
            this.disablePushToTalk();
        }
    }

    setupPushToTalk() {
        this.pttHandler = (event) => {
            if (event.code === this.pttKey) {
                if (event.type === 'keydown') {
                    this.startTransmission();
                } else if (event.type === 'keyup') {
                    this.stopTransmission();
                }
            }
        };

        document.addEventListener('keydown', this.pttHandler);
        document.addEventListener('keyup', this.pttHandler);
    }

    disablePushToTalk() {
        if (this.pttHandler) {
            document.removeEventListener('keydown', this.pttHandler);
            document.removeEventListener('keyup', this.pttHandler);
        }
    }

    startTransmission() {
        if (!this.isEnabled || this.isMuted) return;

        // Enable microphone
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = true;
            });
        }
    }

    stopTransmission() {
        if (!this.pushToTalk) return;

        // Disable microphone (push-to-talk)
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = false;
            });
        }
    }

    getVoiceChatStatus() {
        return {
            enabled: this.isEnabled,
            muted: this.isMuted,
            pushToTalk: this.pushToTalk,
            connectedPeers: this.peers.size,
            masterVolume: this.masterVolume
        };
    }

    cleanup() {
        this.disableVoiceChat();

        if (this.audioContext) {
            this.audioContext.close();
        }

        console.log('Voice chat manager cleaned up');
    }
}