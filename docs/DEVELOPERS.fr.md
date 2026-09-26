# Guide du développeur

*[English version](DEVELOPERS.md)* · *[Retour au README](../README.fr.md)*

Comment fonctionnent les macros, et pourquoi elles sont construites ainsi. Lis d'abord le
[README](../README.fr.md) : il explique ce que font les macros et l'intention derrière elles (peu
d'automatisation, une table qui reste active).

- [Vue d'ensemble](#vue-densemble)
- [Le build](#le-build)
- [Traductions](#traductions)
- [Cartes de tchat](#cartes-de-tchat)
- [Choix de conception](#choix-de-conception)
- [Tester](#tester)
- [Limites connues](#limites-connues)

## Vue d'ensemble

| Fichier | Rôle |
|---|---|
| `trait-roll-d4.js` … `trait-roll-d12.js` | Lancent un dé de trait et le dé Joker, puis postent le résultat sous forme de données |
| `custom-roll.js` | La palette de dés : les mêmes types de jets, avec n'importe quels dés |
| `private-message.js` | Messages privés entre joueurs |
| `spend-benny.js` | Dépense un jeton (une palette si le joueur possède plusieurs personnages) |
| `give-bennies-to-players.js` | Meneur de jeu seulement : donne des jetons à des personnages |
| `start-session.js` | Lancée au démarrage : dessine les cartes, branche les boutons, couleurs Dice So Nice, sons |
| `install-macros.js`, `uninstall-macros.js` | **Générés** : installent et retirent tout en un clic |
| `build/` | Le script de build et les modèles des deux fichiers générés |
| `lang/` | Les traductions |
| `icons/`, `sounds/` | Les icônes (SVG) et les sons, embarqués dans l'installeur |

Les macros sont de simples **macros script** de Foundry : pas de module à nous, rien à installer sur le
serveur. Un meneur de jeu colle `install-macros.js` dans une macro et l'exécute. Tout le reste vit dans les
macros du monde.

L'idée principale : **les macros qui lancent ou postent ne dessinent rien**. Elles rangent *ce qui s'est
passé* dans les drapeaux d'un message de tchat, et `start-session.js` dessine la carte à partir de ces
drapeaux, chez chaque client, à chaque affichage du message. C'est ce qui permet d'ajuster une carte après
coup, et de la traduire dans la langue de chaque lecteur (voir [Cartes de tchat](#cartes-de-tchat)).

## Le build

`python build/build.py` génère `install-macros.js` et `uninstall-macros.js`. **Ne les modifie jamais à la
main** : modifie les sources, la table `MACROS` ou les modèles de `build/*.template.js`, puis relance le
build.

**Pourquoi un build ?** Une macro Foundry est un script autonome rangé dans le monde : elle ne peut pas
importer un autre fichier ni lire le disque local. L'installeur doit donc *contenir* le code de chaque macro,
leurs icônes et leurs sons, sous forme de chaînes. Le faire à la main était source d'erreurs, d'où le script.

### La table `MACROS`

Une entrée par macro installée (`build/build.py`) :

- `key` : identifiant technique, rangé dans `flags.world.macroKey`. C'est ainsi que l'installeur retrouve une
  macro à l'exécution suivante. Renommer une clé rend orpheline la macro déjà présente dans un monde.
- `name` : le nom affiché par défaut (une clé de traduction, ou une chaîne fixe). Il n'est appliqué qu'à la
  **création** de la macro : l'installeur ne renomme jamais une macro existante, donc un nom que tu as changé
  à la main est conservé.
- `slot` : l'emplacement de la barre de raccourcis, ou aucun.
- `source`, `icon`, `refresh` (il faut rafraîchir la page après une mise à jour) et `gm_only`.

Les macros `gm_only` reçoivent la propriété par défaut *Aucune* (les joueurs ne peuvent même pas les voir) et
un emplacement de barre pour les meneurs de jeu seulement. Le désinstalleur ne vide un tel emplacement que
chez les meneurs de jeu, pour ne jamais toucher aux barres des joueurs.

### Ce que fait l'installeur

Pour chaque macro : créer ou mettre à jour le document Macro, écrire son icône dans un vrai fichier `.svg`
avec `FilePicker.upload`, et attribuer l'emplacement de barre à **tous** les utilisateurs du monde, connectés
ou non (un MJ peut modifier n'importe quel utilisateur). Deux détails viennent de contraintes de Foundry :

- **Les icônes doivent être des fichiers.** Le champ `img` d'un document exige un chemin avec une extension
  valide : une URI de données en base64 est refusée. Le nom du fichier contient une empreinte du SVG, donc
  une icône inchangée est réutilisée et non envoyée de nouveau (Foundry ne permet pas de supprimer les
  anciennes depuis un script).
- **Les sons** sont embarqués en base64 et écrits de la même façon dans `worlds/<monde>/macro-sounds/` (liste
  dans `SOUNDS` de `build.py`). Un fichier existant est réutilisé, jamais remplacé.

### Vérifications

`python build/build.py --check` sort en erreur si un fichier généré n'est pas à jour, ou si une icône
embarquée dans une source n'est pas identique à `icons/*.svg`. Les icônes sont aussi embarquées *dans*
certaines sources (`custom-roll.js`, `start-session.js`, `give-bennies-to-players.js`), car une macro ne peut
pas lire `icons/` ; la vérification repère une icône changée à un seul endroit.

Les fichiers générés commencent par `Generated on jj/mm/aaaa hh:mm:ss`. C'est l'heure du dernier vrai
changement : un fichier à jour n'est jamais réécrit, donc une exécution qui ne change rien ne laisse aucune
différence.

`python build/build.py --dump <dossier>` écrit chaque macro telle qu'elle est installée (avec ses
traductions). C'est utile pour tester une macro hors de Foundry.

## Traductions

Les textes vivent dans `lang/<code>.json` : un objet à plat, `"clé": "texte"`, le format des fichiers `lang`
de Foundry. `en.json` est la référence et le repli. `{nom}` est remplacé par une valeur, et les pluriels
utilisent `clé.one` et `clé.other` (choisis avec `Intl.PluralRules`, à partir de la valeur `n`). Voir
[`lang/README.md`](../lang/README.md) pour ajouter une langue.

**Comment les textes arrivent dans une macro.** Les sources appellent `t("card.success", { … })` avec la clé
**écrite en toutes lettres, comme une chaîne littérale**. Le build cherche ces appels et place en tête de
chaque macro compilée uniquement les textes que cette macro utilise, plus la fonction `t()`. Les macros ne
dépendent donc de rien d'autre, et il n'y a aucun fichier à installer dans Foundry. Le prix : **les sources
ne s'exécutent pas seules** (`t` n'existe qu'après le build), d'où `--dump`.

**Quelle langue.** `game.i18n.lang` de chaque client, puis sa langue de base (`fr-CA` donne `fr`), puis
l'anglais. Une clé introuvable est affichée telle quelle. Les cartes, les titres des messages privés et le
bouton **Répondre** sont redessinés à l'affichage, dans la langue du lecteur. Ce qui est fixé à la création
reste dans la langue de son auteur : le texte de repli d'un message, le HTML d'un message privé envoyé et les
**noms des macros**.

Ce dernier point est une limite connue : les infobulles de la barre de raccourcis sont les noms des documents
Macro, que Foundry ne traduit pas. Ils sont fixés à la création et jamais renommés, donc des macros
installées en français gardent leurs noms français. Les renommer à la réinstallation, ou réécrire les
infobulles à l'affichage de la barre (fragile, cela dépend du HTML de Foundry v14), a été envisagé puis
écarté.

Le build vérifie à chaque exécution : une clé inconnue ou non littérale, ou une `{valeur}` différente de
l'anglais, est une **erreur** ; un texte non traduit ou une clé inutilisée est un avertissement.

## Cartes de tchat

L'assainisseur de HTML de Foundry retire ce qu'un message pourrait utiliser pour exécuter du code : pas de
`<svg>` en ligne, pas de `<style>`, pas de scripts, pas de gestionnaires d'événements. Donc :

- les icônes sont des URI de données en base64 dans un simple `<img>` ;
- les boutons et les effets de survol sont branchés **en JavaScript**, par le hook `renderChatMessageHTML` de
  `start-session.js`, une fois la carte dessinée.

### Des données, pas du HTML

Les macros postent un message dont le contenu n'est qu'un texte de repli (affiché si `start-session.js` ne
tourne pas). Le jet lui-même est dans les drapeaux :

| Drapeau (`flags.world.…`) | Posté par | Contenu |
|---|---|---|
| `traitRoll` | jets de trait, palette (dé Joker + un dé) | `dice` (`type`, `faces`, `results` : premier jet puis explosions), `modifier`, `difficulty`, `final` |
| `freeRoll` | palette (tout autre jet) | pareil, sans la logique trait/Joker |
| `bennyCard` | `spend-benny.js` | `name`, `avatar`, `remaining` |
| `bennyGiveCard` | `give-bennies-to-players.js` | `name`, `recipients` (`name`, `avatar`) |
| `whisperReply` | `private-message.js` et le bouton **Répondre** | `replyTo` : l'identifiant de l'expéditeur |

`start-session.js` dessine chaque carte à partir de son drapeau. Ranger des données a trois conséquences :
une carte peut être **ajustée après le jet** (on change les drapeaux, Foundry réaffiche le message chez tous
les clients), elle est dessinée dans **la langue de chaque lecteur**, et une carte n'est jamais désynchronisée
de ses chiffres.

### La carte de jet

- **Avant « Jet définitif »** (`final` faux) : le jet brut : les dés, le meilleur dé comme total, ni
  modificateur ni résultat. Les boutons **−** et **+** ne changent que des valeurs gardées en mémoire chez la
  personne qui règle (`pendingSettings`) : rien n'est encore envoyé aux autres.
- **« Jet définitif »** écrit `modifier`, `difficulty` et `final: true` avec `message.update`. La carte est
  alors redessinée partout, avec le modificateur sur **chaque** dé d'un jet de trait (le meilleur est le
  total), le résultat, les prouesses et les couleurs. Le bouton devient **Ajuster**.
- **Seuls l'auteur et le MJ** peuvent ajuster une carte.
- **Un dé ne descend jamais sous 1**, quel que soit le modificateur : `max(1, somme + modificateur)`. Quand
  le plancher s'applique, la ligne s'écrit `5 − 6 → 1` (une flèche : « = 1 » serait faux en arithmétique).
- **Double 1** : si les deux premiers résultats valent 1, la carte reste un jet brut avec un 💀, pour
  toujours : ni modificateur, ni difficulté, ni bouton, ni résultat, même pour une ancienne carte déjà
  rendue définitive.
- Le **jet libre** additionne tous les dés, applique le modificateur une seule fois et n'a pas de prouesses.
  La difficulté vaut 0 par défaut, ce qui veut dire « pas de difficulté » : aucun résultat n'est affiché.

### Refaire apparaître la carte dans les notifications

Quand la barre du tchat est réduite, Foundry montre la carte d'un nouveau message pendant environ 5 secondes,
puis la masque. Quand quelqu'un applique **Jet définitif** ou **Ajuster**, chaque client compare les valeurs
appliquées à celles de son dernier dessin (`appliedSeen`, une signature `modifier|difficulty|final`). Si
elles ont changé (jamais au premier affichage d'un message, ni quand la carte est redessinée avec les mêmes
valeurs : pas de boucle), alors :

- si une carte **visible** de ce message est déjà dans `#chat-notifications`, elle est **redessinée sur
  place** ;
- sinon `ui.chat.notify(message, { newMessage: true })` la montre de nouveau.

Deux faits, établis en lisant `ui.chat.notify` et la page dans la console, expliquent le code : une carte
expirée **reste dans la page avec `display: none`** (il faut donc tester la visibilité, pas la présence), et
appeler `notify` alors qu'une carte est encore visible en empilerait une seconde.

## Choix de conception

### Les jetons appartiennent au système SWADE

`spend-benny.js` et `give-bennies-to-players.js` appellent les méthodes du système lui-même
(`User#spendBenny`, `Actor#spendBenny`, `Actor#getBenny`), lues dans son code source. Le compte, l'animation
Dice So Nice, les hooks (`swadeSpendBenny`, `swadeGetBenny`) et la règle *hard choices* fonctionnent alors
comme dans le système, et restent justes si le système évolue. Les macros n'ajoutent que la **carte**.

Le système poste aussi son propre message quand le réglage de monde `notifyBennies` est actif. Une macro ne
peut ni le supprimer ni le remplacer, donc la table désactive ce réglage à la main. L'installeur ne le fait
pas de lui-même : ce réglage appartient au meneur de jeu.

**Quels personnages.** Un joueur dépense les jetons de son personnage assigné ; le MJ dépense ceux du MJ. Un
joueur qui possède **plusieurs** personnages obtient une petite palette. La liste des personnages à qui le
MJ donne des jetons est faite de ceux dont un joueur connecté est **propriétaire explicite** (jamais via la
propriété par défaut). Un personnage n'est listé qu'une fois, donc il ne reçoit jamais deux jetons.

### Le double 1 est déclenché par le code

L'effet *Obscurité* était une règle de Dice So Nice (`total == 1`). Elle se déclenchait aussi sur le **dé de
jeton** (`1dB` dans le système SWADE : un dé à **2 faces**, donc un 1 une fois sur deux) et sur tout jet
libre de total 1, et Dice So Nice ne peut pas exclure un type de dé d'une règle (les conditions se combinent
seulement avec « ou »). Maintenant les macros posent `options.sfx = { specialEffect: "PlayAnimationDark" }`
sur les deux dés d'un jet dont le total vaut 1, juste avant `showForRoll`. C'est une fonction documentée de
Dice So Nice, et l'effet se joue quels que soient les réglages propres aux joueurs.

### La palette

La formule a **un terme par dé** (`1d6x + 1d6x`, pas `2d6x`), donc chaque dé a sa propre ligne et ses propres
explosions. Le dé Joker n'est permis qu'avec **un seul** autre dé (ou seul), puisque SWADE n'a pas de jet de
trait à plusieurs dés. La fenêtre l'impose : à partir de deux dés, le dé Joker est grisé. Avec le dé Joker
actif, cliquer sur un dé *remplace* le dé.

### Meneur de jeu seulement

`give-bennies-to-players.js` est installée pour tout le monde, mais avec la propriété *Aucune* pour les
joueurs, et dans la barre de raccourcis des meneurs de jeu seulement. Elle refuse aussi de s'exécuter pour un
joueur.

### Sons

Chaque client décide seul, à partir d'un évènement de Foundry :

- la **pièce** est jouée sur le hook SWADE `swadeGetBenny`, chez le client qui donne le jeton, et **diffusée**
  aux autres (`AudioHelper.play(…, true)`). Des jetons donnés l'un après l'autre (une distribution) ne la
  jouent qu'une fois (délai de 2 s) ;
- le **chuchotement** est joué sur `createChatMessage`, **en local**, chez le client du destinataire
  seulement. Rien n'est diffusé, donc personne d'autre ne l'entend. Le champ `sound` d'un message de tchat n'a
  pas été utilisé : en v14, `_onCreate` ne le joue pas.

Le chemin d'un son est celui que liste `FilePicker.browse` (sur un hébergeur, il peut différer du chemin
simple), sinon le chemin simple. Chaque son a une constante pour l'activer ou le couper en tête de son bloc
dans `start-session.js`, et une ligne dans `SOUNDS` de `build.py` pour arrêter de l'envoyer. Un script ne
peut pas supprimer un fichier envoyé : efface-le à la main.

### Lancement au démarrage

`start-session.js` est lancée par le module **Macro Runner**, qui retrouve la macro par son **nom exact** :
`start-session`. Une ancienne version renommait la macro à chaque installation, ce qui a cassé le lancement
(le bouton **Répondre** ne faisait rien). D'où les règles : le nom par défaut est `start-session`, et
l'installeur ne renomme jamais. Les hooks sont protégés par des gardes (`game._whisperReplyHooked`,
`game._traitRollCardHooked`, …), donc une réinstallation ne prend effet qu'au **prochain chargement de la
page** : rafraîchis (F5). `console.log(game._whisperReplyHooked)` doit afficher `true`.

### Focus

Foundry peut donner le focus à un bouton pendant le rendu d'une fenêtre. Les fenêtres pour écrire un message
privé et pour répondre appellent donc `focus()` sur le champ de texte après `await dialog.render()`, en plus
de l'attribut `autofocus`.

## Tester

**Forcer les dés**, dans la console de Foundry, pour obtenir un double 1 sans l'attendre :

```js
window._randomOrigine ??= CONFIG.Dice.randomUniform;
CONFIG.Dice.randomUniform = () => 0.999;   // tous les dés montrent 1
// pour restaurer : CONFIG.Dice.randomUniform = window._randomOrigine;  (ou F5)
```

N'utilise pas `0.001` : Foundry calcule `1 − random`, donc cela donne le **maximum**, et les dés explosifs
bouclent jusqu'à ce que Foundry les arrête (*Maximum recursion depth for exploding dice roll exceeded*).

**API incertaines.** Quand une API de Foundry n'est pas claire, lis-la dans la console, par exemple
`foundry.audio.AudioHelper.play.toString()`, plutôt que de deviner. Les signatures de `AudioHelper.play` et de
`ui.chat.notify`, et le `_onCreate` d'un message de tchat, ont été établies ainsi.

## Limites connues

Ce qu'une maquette ne peut pas prouver, et qui n'a pas été vérifié dans un vrai Foundry :

- **Sons** : la lecture réelle, la diffusion de la pièce aux autres joueurs, et les chemins sur The Forge.
- **Double 1** : l'effet *Obscurité* sur l'écran des **autres** joueurs (il a fonctionné dans la console de
  l'auteur).
- **Cartes** : qu'un **joueur** ait le droit de faire `message.update` sur son propre message. Si Foundry
  refuse, le joueur reçoit un avertissement (« Impossible de modifier cette carte. »).
- **Notifications** : la réapparition automatique n'est que simulée ; une partie du clignotement au clic peut
  venir du redessin propre à Foundry.
- **Distribuer des jetons** : si un rappel de bouton de `DialogV2` qui renvoie `false` garde la fenêtre
  ouverte (utilisé quand rien n'est sélectionné). La palette de **Dépenser un jeton** évite la question en
  désactivant son bouton.
- **Jet libre** : il n'a pas de plancher : avec un modificateur négatif, le total peut être négatif.
- **Noms** : les infobulles de la barre de raccourcis ne sont pas traduites (voir
  [Traductions](#traductions)).
- **API** : l'API SWADE a été lue sur la branche `develop` du système (`SwadeActor.ts`, `SwadeUser.ts`) ; une
  autre version peut différer.
- **Icône** : l'icône de *Distribuer des jetons* est `icons/gives-bennies-to-players.svg` (avec un « s » en
  trop dans le nom du fichier), utilisée telle quelle dans la table `MACROS`.
