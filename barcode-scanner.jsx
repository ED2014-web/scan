import React, { useState, useEffect, useRef } from 'react';
import { Camera, Scan, Users, X, Check, ChevronRight, History, Plus } from 'lucide-react';

// Utility functions for localStorage
const storage = {
  getUsers: () => {
    const data = localStorage.getItem('barcodeUsers');
    return data ? JSON.parse(data) : {};
  },
  saveUsers: (users) => {
    localStorage.setItem('barcodeUsers', JSON.stringify(users));
  }
};

const BarcodeApp = () => {
  const [view, setView] = useState('home'); // 'home', 'scanner', 'profile', 'register', 'list'
  const [users, setUsers] = useState({});
  const [currentBarcode, setCurrentBarcode] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({ nom: '', prenom: '', photo: '' });
  const [isScanning, setIsScanning] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    setUsers(storage.getUsers());
  }, []);

  useEffect(() => {
    if (view === 'scanner' && !isScanning) {
      initScanner();
    }
    return () => {
      stopScanner();
    };
  }, [view]);

  const initScanner = async () => {
    try {
      const Html5Qrcode = (await import('https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js')).default;
      
      if (scannerRef.current) {
        scannerRef.current.stop();
      }

      const scanner = new Html5Qrcode("scanner-region");
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScan(decodedText);
          scanner.stop();
          setIsScanning(false);
        },
        (error) => {
          // Ignore scan errors
        }
      );
      
      setIsScanning(true);
    } catch (error) {
      console.error('Scanner initialization error:', error);
      alert('Erreur lors de l\'initialisation du scanner. Vérifiez les permissions de la caméra.');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current && isScanning) {
      scannerRef.current.stop().catch(err => console.error(err));
      setIsScanning(false);
    }
  };

  const handleScan = (barcode) => {
    setCurrentBarcode(barcode);
    
    if (users[barcode]) {
      // User exists - show profile
      const user = users[barcode];
      const updatedUser = {
        ...user,
        scans: [...(user.scans || []), new Date().toISOString()]
      };
      
      const updatedUsers = { ...users, [barcode]: updatedUser };
      setUsers(updatedUsers);
      storage.saveUsers(updatedUsers);
      setCurrentUser(updatedUser);
      setView('profile');
    } else {
      // New user - show registration form
      setView('register');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      videoRef.current.srcObject = stream;
      setCameraStream(stream);
    } catch (error) {
      alert('Impossible d\'accéder à la caméra');
    }
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const photo = canvas.toDataURL('image/jpeg', 0.8);
    setFormData({ ...formData, photo });
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleRegister = () => {
    if (!formData.nom || !formData.prenom) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const newUser = {
      nom: formData.nom,
      prenom: formData.prenom,
      photo: formData.photo,
      scans: [new Date().toISOString()]
    };

    const updatedUsers = { ...users, [currentBarcode]: newUser };
    setUsers(updatedUsers);
    storage.saveUsers(updatedUsers);
    
    setCurrentUser(newUser);
    setFormData({ nom: '', prenom: '', photo: '' });
    setView('profile');
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Home View
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvZz48L3N2Zz4=')] opacity-40"></div>
        
        <div className="relative z-10 max-w-md mx-auto px-6 pt-16 pb-24">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-block p-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-3xl mb-6 shadow-2xl shadow-cyan-500/50">
              <Scan size={48} strokeWidth={2.5} />
            </div>
            <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              BarcodePro
            </h1>
            <p className="text-lg text-slate-300 font-light tracking-wide">
              Gestion intelligente de codes-barres
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setView('scanner')}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-5 rounded-2xl font-bold text-lg shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/50 flex items-center justify-between px-6"
            >
              <div className="flex items-center gap-3">
                <Camera size={24} />
                <span>Scanner un code</span>
              </div>
              <ChevronRight size={24} />
            </button>

            <button
              onClick={() => setView('list')}
              className="w-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white py-5 rounded-2xl font-semibold text-lg border border-white/20 transition-all duration-300 hover:scale-105 flex items-center justify-between px-6"
            >
              <div className="flex items-center gap-3">
                <Users size={24} />
                <span>Liste des codes</span>
              </div>
              <span className="bg-cyan-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {Object.keys(users).length}
              </span>
            </button>
          </div>

          <div className="mt-16 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-cyan-300 mb-2 uppercase tracking-wider">Info</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Scannez un code-barres pour afficher ou créer une fiche utilisateur avec photo et historique.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Scanner View
  if (view === 'scanner') {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-md mx-auto">
          <div className="p-6 flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900">
            <h2 className="text-2xl font-bold">Scanner</h2>
            <button
              onClick={() => {
                stopScanner();
                setView('home');
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6">
            <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-cyan-500/50">
              <div id="scanner-region" className="w-full aspect-square"></div>
              
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                  <div className="text-center">
                    <div className="animate-pulse mb-4">
                      <Camera size={48} className="mx-auto text-cyan-400" />
                    </div>
                    <p className="text-slate-300">Initialisation du scanner...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                Placez le code-barres dans le cadre
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Profile View
  if (view === 'profile' && currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 text-white">
        <div className="max-w-md mx-auto">
          <div className="p-6 flex items-center justify-between bg-gradient-to-r from-slate-800/80 to-purple-800/80 backdrop-blur-sm">
            <h2 className="text-2xl font-bold">Profil</h2>
            <button
              onClick={() => {
                setCurrentUser(null);
                setCurrentBarcode(null);
                setView('home');
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 text-center">
              {currentUser.photo ? (
                <img
                  src={currentUser.photo}
                  alt="Photo"
                  className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-cyan-400 shadow-lg shadow-cyan-500/30 object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Users size={48} />
                </div>
              )}
              
              <h3 className="text-3xl font-bold mb-1">
                {currentUser.prenom} {currentUser.nom}
              </h3>
              <p className="text-cyan-300 font-mono text-sm">
                Code: {currentBarcode}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <History size={24} className="text-cyan-400" />
                <h4 className="text-xl font-bold">Historique des scans</h4>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentUser.scans.slice().reverse().map((scan, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span className="text-sm text-slate-300">
                      {formatDate(scan)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 text-center">
                <p className="text-sm text-slate-400">
                  Total: <span className="text-cyan-400 font-bold text-lg">{currentUser.scans.length}</span> scan(s)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Register View
  if (view === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 text-white">
        <div className="max-w-md mx-auto">
          <div className="p-6 flex items-center justify-between bg-gradient-to-r from-slate-800/80 to-purple-800/80 backdrop-blur-sm">
            <h2 className="text-2xl font-bold">Nouvelle fiche</h2>
            <button
              onClick={() => {
                setCurrentBarcode(null);
                setFormData({ nom: '', prenom: '', photo: '' });
                setView('home');
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 flex items-start gap-3">
              <Plus size={24} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-cyan-300 mb-1">Nouveau code détecté</p>
                <p className="text-xs text-slate-300 font-mono">{currentBarcode}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-cyan-300">Prénom</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-400"
                  placeholder="Entrez le prénom"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-cyan-300">Nom</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-400"
                  placeholder="Entrez le nom"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-cyan-300">Photo</label>
                
                {!formData.photo && !cameraStream && (
                  <button
                    onClick={startCamera}
                    className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all flex items-center justify-center gap-3 font-semibold"
                  >
                    <Camera size={24} />
                    Prendre une photo
                  </button>
                )}

                {cameraStream && !formData.photo && (
                  <div className="space-y-3">
                    <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/50">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full"
                      ></video>
                    </div>
                    <button
                      onClick={takePhoto}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Camera size={20} />
                      Capturer
                    </button>
                  </div>
                )}

                {formData.photo && (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/50">
                      <img
                        src={formData.photo}
                        alt="Photo preview"
                        className="w-full"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setFormData({ ...formData, photo: '' });
                        startCamera();
                      }}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-colors"
                    >
                      Reprendre la photo
                    </button>
                  </div>
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              </div>
            </div>

            <button
              onClick={handleRegister}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-2xl font-bold text-lg shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 flex items-center justify-center gap-3"
            >
              <Check size={24} />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List View
  if (view === 'list') {
    const usersList = Object.entries(users);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900 text-white">
        <div className="max-w-md mx-auto">
          <div className="p-6 flex items-center justify-between bg-gradient-to-r from-slate-800/80 to-purple-800/80 backdrop-blur-sm sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-bold">Liste des codes</h2>
              <p className="text-sm text-slate-300">{usersList.length} personne(s)</p>
            </div>
            <button
              onClick={() => setView('home')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-3">
            {usersList.length === 0 ? (
              <div className="text-center py-16">
                <Users size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">Aucun code enregistré</p>
                <button
                  onClick={() => setView('scanner')}
                  className="mt-4 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-xl font-semibold transition-colors"
                >
                  Scanner un code
                </button>
              </div>
            ) : (
              usersList.map(([barcode, user]) => (
                <button
                  key={barcode}
                  onClick={() => {
                    setCurrentBarcode(barcode);
                    setCurrentUser(user);
                    setView('profile');
                  }}
                  className="w-full bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-2xl p-4 border border-white/20 transition-all hover:scale-102 flex items-center gap-4"
                >
                  {user.photo ? (
                    <img
                      src={user.photo}
                      alt="Photo"
                      className="w-16 h-16 rounded-full border-2 border-cyan-400 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Users size={28} />
                    </div>
                  )}
                  
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-lg">
                      {user.prenom} {user.nom}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{barcode}</p>
                    <p className="text-xs text-cyan-300 mt-1">
                      {user.scans.length} scan(s)
                    </p>
                  </div>

                  <ChevronRight size={24} className="text-slate-400" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BarcodeApp;
