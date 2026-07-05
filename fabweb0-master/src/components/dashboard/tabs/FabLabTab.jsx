import { useState } from 'react';
import { useApp, TABS } from '../../../context/AppContext';

export default function FabLabTab() {
  const { setActiveTab, searchQuery, setSearchQuery, searchFilter, setSearchFilter } = useApp();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineTab, setMachineTab] = useState(null); // 'guide' or 'safety'

  const roles = [
    { id: 'ALL', label: 'Tous les rôles', icon: '👥' },
    { id: 'STAGIAIRE', label: 'Stagiaires', icon: '🎓' },
    { id: 'FORMATEUR', label: 'Formateurs', icon: '👨‍🏫' },
    { id: 'ADMINISTRATEUR', label: 'Administrateurs', icon: '🛡️' },
    { id: 'VISITEUR', label: 'Visiteurs', icon: '👤' }
  ];

  const machines = [
    {
      name: "Impression 3D",
      desc: "Créez des objets physiques couche par couche à partir de modèles numériques.",
      color: "blue",
      icon: "M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5",
      fullDesc: "L'impression 3D (ou fabrication additive) transforme des modèles numériques 3D en objets physiques. C'est l'outil idéal pour le prototypage rapide et la création de pièces personnalisées complexes.",
      steps: [
        "Concevez votre objet en 3D (Tinkercad, Fusion 360, etc.)",
        "Exportez le fichier au format .STL",
        "Préparez l'impression avec un logiciel de Slicing (Cura)",
        "Transférez le fichier via SD/USB et lancez l'impression"
      ],
      safety: [
        "Ne touchez jamais la buse (Nozzle) - Température > 200°C",
        "Ne manipulez pas les axes mobiles pendant l'impression",
        "Gardez l'espace de travail propre et dégagé"
      ]
    },
    {
      name: "Découpe Laser",
      desc: "Découpez ou gravez divers matériaux avec une précision chirurgicale.",
      color: "emerald",
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
      fullDesc: "La découpe laser utilise un faisceau de haute puissance pour découper ou graver des matériaux comme le bois, l'acrylique ou le cuir avec une précision extrême.",
      steps: [
        "Importez votre dessin vectoriel (.SVG ou .DXF)",
        "Définissez les paramètres de puissance et de vitesse",
        "Placez votre matériau et réglez la focale du laser",
        "Lancez la découpe en gardant l'œil sur la machine"
      ],
      safety: [
        "Portez TOUJOURS les lunettes de protection fournies",
        "Ne laissez JAMAIS la machine sans surveillance",
        "Vérifiez que le système d'extraction de fumée est actif"
      ]
    },
    {
      name: "Assemblage",
      desc: "Usinage de précision pour le bois, le métal et les circuits imprimés.",
      color: "purple",
      icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
      fullDesc: "L'assemblage permet de réunir, ajuster et sécuriser les pièces d'un prototype. Idéal pour finaliser une structure et vérifier sa solidité.",
      steps: [
        "Fixez solidement votre brut sur le plateau",
        "Installez la fraise appropriée (mèche)",
        "Faites le 'Zéro' des axes X, Y et Z",
        "Lancez le programme G-Code généré par votre logiciel"
      ],
      safety: [
        "Attachez vos cheveux et évitez les vêtements amples",
        "Utilisez toujours des protections auditives et oculaires",
        "N'approchez pas vos mains de la fraise en rotation"
      ]
    },
    {
      name: "Électronique",
      desc: "Postes de soudure, oscilloscopes et conception de circuits.",
      color: "orange",
      icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      fullDesc: "Notre station d'électronique est équipée pour concevoir, souder et tester vos circuits imprimés. Parfait pour ajouter de l'intelligence à vos prototypes.",
      steps: [
        "Préparez vos composants et votre circuit (PCB)",
        "Chauffez le fer à souder (350°C environ)",
        "Réalisez vos soudures avec précision et propreté",
        "Testez les tensions avec le multimètre avant d'alimenter"
      ],
      safety: [
        "Évitez de respirer les fumées de soudure",
        "Ne laissez pas le fer chaud sur le tapis de travail",
        "Lavez-vous les mains après avoir manipulé de l'étain"
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden">

      {/* Main Scrollable Content */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 transition-all duration-300 ${selectedMachine ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'}`}>
        <div className="text-center space-y-2 pt-4">
          <div className="h-20 w-20 mx-auto mb-4 bg-t-surface glass-card rounded-2xl shadow-sm p-2 flex items-center justify-center border border-t-border">
            <img src="/f.webp" alt="Fab Lab Logo" className="max-h-full max-w-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-t-primary">L'Univers Fab Lab</h2>
          <p className="text-sm text-t-secondary font-medium leading-relaxed px-4">
            Un laboratoire de fabrication numérique ouvert à tous pour concrétiser vos idées.
          </p>

          <div className="px-2 mt-6">
            <div className="relative flex items-center bg-t-surface dark-solid rounded-[24px] shadow-xl shadow-blue-900/5 border border-t-border overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#3B5FE6]/20">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un membre..."
                className="flex-1 py-4 px-6 text-[13px] font-bold text-t-primary outline-none placeholder:text-t-muted bg-transparent"
              />
              <div className="flex items-center pr-2 space-x-1">
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className={`p-3 transition-colors ${searchFilter !== 'ALL' ? 'text-[#3B5FE6]' : 'text-t-muted'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab(TABS.SEARCH)}
                  className="w-10 h-10 bg-[#3B5FE6] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
            {searchFilter !== 'ALL' && (
              <div className="mt-2 flex justify-start animate-fade-in px-2">
                <span className="text-[9px] font-black uppercase text-[#3B5FE6] bg-blue-50 px-2 py-1 rounded-md border border-blue-100 flex items-center space-x-1">
                  <span>Filtre: {searchFilter}</span>
                  <button onClick={() => setSearchFilter('ALL')}>×</button>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-t-surface glass-card rounded-[32px] p-6 shadow-sm border border-t-border space-y-4">
          <div className="flex items-center space-x-3 text-[#3B5FE6]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-bold text-lg">C'est quoi un Fab Lab ?</h3>
          </div>
          <p className="text-sm text-t-secondary font-medium leading-relaxed">
            Le concept de <b>Fab Lab</b> (Fabrication Laboratory) est un réseau mondial de laboratoires locaux qui dopent l'inventivité en donnant accès à des outils de fabrication numérique. C'est un espace de partage de connaissances où l'on peut fabriquer (presque) n'importe quoi.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-t-tertiary uppercase tracking-[0.2em] px-2">Nos Machines</h3>
          <div className="grid grid-cols-2 gap-4">
            {machines.map((machine) => (
              <button
                key={machine.name}
                onClick={() => { setSelectedMachine(machine); setMachineTab(null); }}
                className="bg-t-surface glass-card glow-on-hover p-4 rounded-3xl border border-t-border shadow-sm space-y-3 text-left transition-all active:scale-95 hover:border-[#3B5FE6]/30"
              >
                <div className={`p-2 rounded-xl w-fit ${machine.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                    machine.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                      machine.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                        'bg-orange-50 text-orange-600'
                  }`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={machine.icon} />
                  </svg>
                </div>
                <h4 className="font-bold text-sm text-t-primary">{machine.name}</h4>
                <p className="text-[11px] text-t-secondary leading-tight">{machine.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#3B5FE6] rounded-[32px] p-6 shadow-xl text-white space-y-6">
          <h3 className="font-bold text-xl">Comment ça marche ?</h3>
          <div className="space-y-4">
            {[
              { step: 1, text: <><b>Imaginez</b> votre concept ou projet.</> },
              { step: 2, text: <><b>Modélisez</b> en utilisant nos logiciels de CAO.</> },
              { step: 3, text: <><b>Fabriquez</b> avec l'aide de nos experts.</> }
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start space-x-4">
                <div className="bg-white/20 rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                <p className="text-sm font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="pb-24"></div>
      </div>

      {/* Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-t-surface rounded-t-[40px] p-8 animate-slide-up shadow-2xl transition-colors duration-300">
            <div className="w-12 h-1.5 bg-t-border rounded-full mx-auto mb-8"></div>
            <h3 className="text-xl font-black text-t-primary mb-8">Filtrer par rôle</h3>
            <div className="space-y-3">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => { setSearchFilter(role.id); setIsFilterOpen(false); }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${searchFilter === role.id ? 'bg-blue-50 text-[#3B5FE6] border-2 border-[#3B5FE6]/20' : 'bg-t-surface-alt text-t-secondary'}`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{role.icon}</span>
                    <span className="font-bold text-[15px]">{role.label}</span>
                  </div>
                  {searchFilter === role.id && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedMachine && (
        <div className="absolute inset-0 z-50 main-container flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">

          {/* Main Machine Detail View */}
          <div className={`flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-8 transition-all duration-300 ${machineTab ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none' : 'opacity-100 translate-x-0 relative'}`}>
            <div className="flex items-center justify-between pt-4 px-2 shrink-0">
              <button
                onClick={() => setSelectedMachine(null)}
                className="p-2 text-t-tertiary hover:text-t-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="text-xl font-bold text-t-primary text-center flex-1 mx-4 uppercase tracking-tighter">Fiche Machine</h2>
              <div className="w-10"></div>
            </div>

            <div className="space-y-4">
              <div className="bg-t-surface rounded-[32px] overflow-hidden shadow-sm border border-t-border flex flex-col items-center transition-colors duration-300">
                <div className="w-full aspect-video bg-t-surface-alt flex items-center justify-center relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                  <svg className="h-20 w-20 text-t-muted group-hover:scale-110 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d={selectedMachine.icon} />
                  </svg>
                  <span className="absolute bottom-4 right-4 text-[9px] font-black text-t-muted uppercase tracking-widest">Image à venir</span>
                </div>
                <div className="p-8 text-center space-y-2">
                  <h3 className="text-2xl font-black text-t-primary uppercase tracking-tighter">{selectedMachine.name}</h3>
                  <p className="text-sm text-t-secondary font-medium leading-relaxed">{selectedMachine.fullDesc}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMachineTab('guide')}
                className="flex flex-col items-center justify-center p-5 rounded-3xl border transition-all active:scale-95 bg-t-surface border-t-border text-t-primary hover:border-[#3B5FE6]/30 shadow-sm group"
              >
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6 text-[#3B5FE6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-t-secondary">Guide</span>
              </button>

              <button
                onClick={() => setMachineTab('safety')}
                className="flex flex-col items-center justify-center p-5 rounded-3xl border transition-all active:scale-95 bg-t-surface border-t-border text-t-primary hover:border-amber-500/30 shadow-sm group"
              >
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 15c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-t-secondary">Sécurité</span>
              </button>
            </div>
            <div className="pb-32"></div>
          </div>

          {/* Sub-Screen: Guide or Safety */}
          {machineTab && (
            <div className="absolute inset-0 main-container z-10 flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden shadow-2xl">
              <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-8">

                {/* Sub-Screen Header */}
                <div className="flex items-center justify-between pt-4 px-2 shrink-0">
                  <button
                    onClick={() => setMachineTab(null)}
                    className="p-2 text-t-tertiary hover:text-t-primary transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <h2 className="text-xl font-bold text-t-primary text-center flex-1 mx-4 uppercase tracking-tighter">
                    {machineTab === 'guide' ? "Guide d'utilisation" : "Sécurité"}
                  </h2>
                  <div className="w-10"></div>
                </div>

                {/* Sub-Screen Content */}
                <div className="space-y-4">
                  {machineTab === 'guide' && (
                    <div className="space-y-3">
                      {selectedMachine.steps.map((step, idx) => (
                        <div key={idx} className="bg-t-surface p-5 rounded-3xl border border-t-border flex items-start space-x-4 shadow-sm transition-colors duration-300">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3B5FE6] flex items-center justify-center font-black text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-sm font-bold text-t-secondary leading-snug">{step}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {machineTab === 'safety' && (
                    <div className="bg-amber-50 border-2 border-amber-100 rounded-[32px] p-6 space-y-4 shadow-sm">
                      {selectedMachine.safety.map((rule, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <div className="mt-1 w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></div>
                          <p className="text-xs font-bold text-amber-900/70 leading-relaxed">{rule}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pb-32"></div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
