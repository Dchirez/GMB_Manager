import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white border-b border-gray-200">
        <div class="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a routerLink="/" class="text-xl font-bold text-gray-800">GMB Manager</a>
          <a routerLink="/" class="text-sm text-blue-600 hover:text-blue-700">← Accueil</a>
        </div>
      </header>

      <main class="max-w-3xl mx-auto px-6 py-10">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Politique de confidentialité</h1>
        <p class="text-sm text-gray-500 mb-8">Dernière mise à jour : mai 2026</p>

        <div class="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">1. Responsable du traitement</h2>
            <p>
              GMB Manager est une application éditée par un développeur indépendant.
              Pour toute question relative à vos données personnelles, vous pouvez nous
              contacter à l'adresse :
              <a href="mailto:dchirez59&#64;gmail.com" class="text-blue-600 hover:underline">dchirez59&#64;gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">2. Données que nous collectons</h2>
            <p class="mb-2">Lorsque vous vous connectez via Google et utilisez l'application, nous traitons :</p>
            <ul class="list-disc pl-6 space-y-1">
              <li>Les informations de votre compte Google : adresse e-mail, nom et identifiant Google unique (<code>sub</code>).</li>
              <li>Les jetons d'accès et de rafraîchissement OAuth délivrés par Google, nécessaires pour accéder à l'API Google Business Profile en votre nom.</li>
              <li>Les données de vos fiches Google Business Profile : nom de l'établissement, adresse, horaires, catégories, avis clients et publications.</li>
              <li>Les contenus que vous créez via l'application (réponses aux avis, publications, photos téléversées).</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">3. Utilisation des données</h2>
            <p class="mb-2">Vos données sont utilisées exclusivement pour fournir les fonctionnalités du service :</p>
            <ul class="list-disc pl-6 space-y-1">
              <li>Vous authentifier et sécuriser votre session.</li>
              <li>Afficher et calculer le score de complétude de vos fiches.</li>
              <li>Consulter, suivre et répondre à vos avis clients.</li>
              <li>Créer et publier des publications sur vos fiches.</li>
              <li>Afficher des statistiques relatives à vos fiches.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">4. Conformité à la politique des données utilisateur des API Google</h2>
            <p>
              L'utilisation par GMB Manager des informations reçues des API Google est conforme à la
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener" class="text-blue-600 hover:underline">
                Google API Services User Data Policy</a>, y compris aux exigences d'<strong>utilisation limitée</strong> (Limited Use).
              Nous n'utilisons les données des API Google que pour fournir et améliorer les fonctionnalités
              visibles par l'utilisateur dans l'application. Nous ne transférons ni ne vendons ces données à des
              fins publicitaires, et nous n'autorisons aucun humain à les lire, sauf si vous y consentez
              explicitement, pour des raisons de sécurité, pour nous conformer à la loi, ou lorsque ces données
              sont agrégées et anonymisées.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">5. Partage des données</h2>
            <p class="mb-2">Nous ne vendons pas vos données. Elles peuvent être traitées par les sous-traitants techniques suivants, uniquement pour faire fonctionner le service :</p>
            <ul class="list-disc pl-6 space-y-1">
              <li><strong>Google</strong> — authentification et API Google Business Profile.</li>
              <li><strong>Render</strong> — hébergement du serveur applicatif.</li>
              <li><strong>Supabase</strong> — base de données hébergeant vos informations de compte et jetons.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">6. Conservation et suppression</h2>
            <p>
              Vos données sont conservées tant que votre compte est actif. Vous pouvez à tout moment demander la
              suppression de votre compte et de l'ensemble des données associées (y compris les jetons OAuth) en
              nous écrivant à
              <a href="mailto:dchirez59&#64;gmail.com" class="text-blue-600 hover:underline">dchirez59&#64;gmail.com</a>.
              Vous pouvez également révoquer l'accès de GMB Manager à votre compte Google à tout moment depuis
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener" class="text-blue-600 hover:underline">les paramètres de sécurité de votre compte Google</a>.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">7. Sécurité</h2>
            <p>
              Les échanges sont chiffrés via HTTPS. Les jetons d'accès sont stockés de manière sécurisée et
              utilisés uniquement pour communiquer avec les API Google. Nous mettons en œuvre des mesures
              techniques raisonnables pour protéger vos données contre tout accès non autorisé.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">8. Cookies</h2>
            <p>
              GMB Manager utilise uniquement des cookies strictement nécessaires au fonctionnement de
              l'authentification (gestion de session et protection CSRF lors de la connexion). Aucun cookie
              publicitaire ou de suivi tiers n'est utilisé.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">9. Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de portabilité et de
              suppression de vos données, ainsi que d'un droit d'opposition. Pour exercer ces droits, contactez-nous à
              <a href="mailto:dchirez59&#64;gmail.com" class="text-blue-600 hover:underline">dchirez59&#64;gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">10. Modifications</h2>
            <p>
              Cette politique de confidentialité peut être mise à jour. Toute modification importante sera
              signalée sur cette page avec une date de mise à jour actualisée.
            </p>
          </section>
        </div>
      </main>

      <footer class="border-t border-gray-200 bg-white">
        <div class="max-w-3xl mx-auto px-6 py-6 text-sm text-gray-500 flex items-center justify-between">
          <span>© {{ year }} GMB Manager</span>
          <a routerLink="/" class="hover:text-blue-600">Accueil</a>
        </div>
      </footer>
    </div>
  `
})
export class PrivacyComponent {
  year = new Date().getFullYear();
}
