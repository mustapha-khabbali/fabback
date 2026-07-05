import { useApp } from '../../context/AppContext';

export default function CharteScreen() {
  const { returnFromCharte } = useApp();

  return (
    <div className="flex flex-col w-full h-full max-w-2xl mx-auto p-6 justify-between overflow-hidden">
      <div className="text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-t-primary">Charte internationale des fablabs</h2>
        <div className="w-20 h-1 bg-primary-blue-top mx-auto rounded-full"></div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 custom-scrollbar text-t-primary/90 leading-relaxed font-medium my-4">
        <section className="space-y-2">
          <h3 className="text-lg font-bold text-t-primary">Qu'est-ce qu'un Fab Lab ?</h3>
          <p>Les Fab Labs sont un réseau mondial de laboratoires locaux, qui dopent l'inventivité en donnant accès à des outils de fabrication numérique.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-bold text-t-primary">Que trouve-t-on dans un Fab Lab ?</h3>
          <p>Les Fab Labs partagent le catalogue évolutif d'un noyau de capacités pour fabriquer (presque) n'importe quel objet, permettant aux personnes et aux projets d'être partagés.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-bold text-t-primary">Que fournit le réseau des Fab Labs ?</h3>
          <p>Une assistance opérationnelle, d'éducation, technique, financière et logistique au-delà de ce qui est disponible dans un seul lab.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-bold text-t-primary">Qui peut utiliser un Fab Lab ?</h3>
          <p>Les Fab Labs sont disponibles comme une ressource communautaire, qui propose un accès libre aux individus autant qu'un accès sur inscription dans le cadre de programmes spécifiques.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-bold text-t-primary">Quelles sont vos responsabilités ?</h3>
          <ul className="space-y-2 list-none pl-1">
            <li className="flex items-start"><span className="mr-2 text-primary-blue-top px-1 font-bold">→</span>Sécurité : Ne blesser personne et ne pas endommager l'équipement.</li>
            <li className="flex items-start"><span className="mr-2 text-primary-blue-top px-1 font-bold">→</span>Fonctionnement : Aider à nettoyer, maintenir et améliorer le Lab.</li>
            <li className="flex items-start"><span className="mr-2 text-primary-blue-top px-1 font-bold">→</span>Connaissances : Contribuer à la documentation et aux connaissances des autres.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-bold text-t-primary">Qui possède les inventions faites dans un Fab Lab ?</h3>
          <p>Les designs et les procédés développés dans les Fab Labs peuvent être protégés et vendus comme le souhaite leur inventeur, mais doivent rester disponibles de manière que les individus puissent les utiliser et en apprendre.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-bold text-t-primary">Comment les entreprises peuvent utiliser un Fab Lab ?</h3>
          <p>Les activités commerciales peuvent être prototypées et incubées dans un Fab Lab, mais elles ne doivent pas entrer en conflit avec les autres usages, elles doivent croître au-delà du Lab plutôt qu'en son sein, et il est attendu qu'elles bénéficient à leurs inventeurs, aux Labs, et aux réseaux qui ont contribué à leur succès.</p>
        </section>

        <div className="pt-6 pb-4 text-center border-t border-t-border mt-8">
          <p className="text-lg font-bold text-t-primary">J'engage à respecter la Charte FAB LAB</p>
        </div>
      </div>

      <div className="pt-4 text-center">
        <button onClick={returnFromCharte}
          className="w-full max-w-[240px] py-4 bg-midnight-blue text-white font-bold text-lg rounded-xl shadow-lg hover:brightness-110 hover:-translate-y-1 transition-all duration-300 active:scale-95 leading-none">
          Retour
        </button>
      </div>
    </div>
  );
}
