/* Free-form dice palette: a standard Foundry window (DialogV2) offers a d4, d6, d8, d10,
   d12 and a Joker die. Clicking a die's icon adds one; the "−" button removes one. A
   selected die (counter above 0) keeps a colored border around its icon.
   "Lancer" (Roll) sums up every selected die (each one exploding), and if the Joker is
   active, compares that sum against the Joker die alone (also exploding) and keeps the
   higher of the two (the same mechanic as trait-roll.js, generalized from a single die to
   an arbitrary pool of dice). "Annuler" (Cancel) closes the palette without rolling.

   The Joker die is a simple on/off toggle (never more than one at a time): in SWADE, only
   one Joker die is ever rolled per roll. It is also rolled alongside a single trait die, so
   it cannot be combined with several dice: the Joker is unavailable (dimmed, with an
   explanatory hint above the dice) while 2+ dice are selected, and while it is active,
   selecting a die replaces the previously selected one (also explained by a hint).

   The result is posted to chat as data and drawn by start-session.js (same parchment style as
   the trait-roll-*.js cards, with modifier / difficulty buttons): a Joker rolled with a single
   other die is a SWADE trait roll (same card as the trait-roll-*.js macros); any other roll is
   a free roll (all the dice added up, difficulty 0 by default, no raises). */

(async () => {
  const DICE_SIZES = [4, 6, 8, 10, 12];

  // Foundry's HTML sanitizer strips inline <svg> elements from both DialogV2 content and
  // chat message content, so every icon is always converted to a base64 data URI wrapped
  // in a plain <img> tag instead — used here for both the palette and the result message
  // (see start-session.js for the same technique).
  const svgToDataUri = (svg) => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

  // Icons embedded directly in the code (see icons/*.svg in the project): a macro script
  // runs inside the browser with no access to the local filesystem.
  const DIE_ICON_SVG = {
    4: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M90.743,59.829c8.745,-12.906 16.355,-35.4 23.689,-31.814c3.102,1.517 2.904,1.919 22.566,36.79l1.056,1.77c4.326,8.095 21.532,37.852 23.428,41.13c0.176,0.3 0.351,0.6 0.527,0.9c10.926,19.803 22.236,39.222 24.209,42.61c21.58,38.503 26.907,42.941 18.085,46.08c-2.039,0.725 -181.568,0.481 -182.893,0.131c-8.372,-2.209 -3.523,-9.32 -2.257,-11.785c3.654,-6.269 12.746,-22.287 13.848,-24.228c8.843,-15.581 8.799,-15.573 9.574,-16.922c11.943,-21.102 11.99,-20.982 23.948,-42.03c0.172,-0.295 0.344,-0.59 0.516,-0.885c4.029,-7.181 18.091,-31.485 23.704,-41.747Z" style="fill:#1d4d2d;fill-opacity:1;"/><path d="M160.46,172.854c-0.231,-3.665 -0.295,-13.673 -3.669,-7.679c-6.123,10.878 -6.711,10.812 -7.874,10.548c-5.207,-1.18 -3.812,-3.292 -1.171,-7.887c9.59,-16.683 9.919,-17.597 11.675,-16.8c7.803,3.54 5.915,19.164 8.468,25.473c3.007,7.429 15.985,2.287 7.377,-6.768c-2.953,-3.106 0.992,-8.152 3.5,-6.452c13.651,9.25 1.529,28.286 -9.642,23.835c-7.628,-3.039 -8.139,-8.319 -8.666,-14.27Z" style="fill:#e7ece8;"/><path d="M121.416,90.377c-0.079,0.715 1.063,4.165 -5.497,3.431c-2.999,-0.336 -0.154,-8.228 -3.817,-8.364c-10.489,-0.392 -12.687,1.812 -13.177,-2.613c-0.849,-7.657 4.551,-8.955 13.557,-22.979c2.49,-3.878 8.793,-3.687 8.897,-0.253c0.54,17.829 -0.668,19.193 1.986,19.594c0.459,0.069 4.558,0.688 2.421,5.279c-0.371,0.798 -2.648,0.965 -3.248,1.204c-1.832,0.731 -0.922,1.36 -1.123,4.701Z" style="fill:#e7ebe9;"/><path d="M56.62,178.877c1.804,3.716 2.611,5.395 -1.497,5.988c-3.83,0.553 -1.9,-5.511 -11.251,-5.34c-0.342,0.006 -7.636,-2.678 -0.531,-7.035c2.103,-1.289 24.439,-14.984 26.79,-15.272c0.866,-0.106 6.417,4.426 2.032,7.049c-6.918,4.138 -6.938,3.997 -13.867,8.145c-3.398,2.034 -3.27,2.781 -1.676,6.465Z" style="fill:#e7ece8;"/><path d="M114.262,76.123c-0.953,4.236 -2.349,3.157 -6.646,3.115c-3.863,-0.038 0.325,-4.098 3.502,-8.552c0.17,-0.238 2.131,-2.988 2.735,-2.421c0.648,0.609 0.417,5.038 0.409,7.859Z" style="fill:#214b30;"/></g></svg>`,
    6: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M18.282,23.573c3.116,-2.287 5.687,-6.896 12.829,-7.022c5.715,-0.1 148.091,0.142 162.01,-0.112c1.133,-0.021 8.715,-0.159 12.555,6.567c3.24,5.676 2.798,6.031 2.798,39.619c-0,133.443 0.072,133.472 -0.57,135.698c-1.304,4.521 -7.706,10.023 -13.254,10.122c-5.558,0.099 -154.119,-0.053 -163.522,0.079c-5.492,0.077 -14.512,-4.366 -14.6,-15.391c-0.042,-5.266 0.061,-156.394 -0.053,-161.254c-0.078,-3.331 0.93,-5.016 1.805,-8.305Z" style="fill:#d4b32e;fill-opacity:1;"/><path d="M114.394,147.703c-18.439,-0.856 -25.865,-10.363 -27.132,-34.073c-0.6,-11.222 4.313,-29.574 16.693,-35.072c21.64,-9.611 36.372,13.788 30.587,16.091c-0.389,0.155 -9.464,1.97 -11.64,-1.445c-0.728,-1.142 -8.123,-12.749 -16.697,-2.76c-3.391,3.951 -8.512,18.81 -1.397,13.681c16.904,-12.187 42.949,7.372 28.827,32.613c-5.529,9.882 -17.474,10.826 -19.241,10.966Z" style="fill:#020000;"/><path d="M101.962,124.12c0.124,-0.687 0.246,-12.358 9.436,-13.339c9.865,-1.052 11.884,8.353 12.143,9.562c3.715,17.305 -19.435,23.732 -21.579,3.777Z" style="fill:#d3b334;"/></g></svg>`,
    8: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M111.682,2.938c1.438,0.435 1.369,0.553 2.133,1.821c2.098,3.483 13.653,22.67 25.702,43.843c43.905,77.154 67.86,116.747 66.844,117.414c-0.308,0.202 -0.336,0.209 -172.985,0.204c-12.948,-0 -13.137,0.346 -14.564,-0.823l0.594,-1.367c10.153,-18.874 90.873,-157.292 92.277,-161.092Z" style="fill:#c50001;fill-opacity:1;"/><path d="M102.578,5.923c1.942,-1.023 1.847,-1.145 2.023,-1.215c3.326,-1.335 0.168,2.063 -21.371,39.366c-28.889,50.032 -28.749,50.104 -31.299,54.433c-32.189,54.652 -32.296,54.915 -34.389,60.04c-0.416,-0.235 -0.832,-0.469 -1.248,-0.704c0.338,-13.176 0.219,-13.162 0.23,-80.967c0.003,-19.759 -0.495,-20.311 2.02,-22.269c20.091,-11.889 20.277,-11.475 40.392,-23.371c0.807,-0.64 2.132,-1.284 2.327,-1.378c26.947,-15.803 27.035,-15.63 29.281,-17.155c4.966,-2.599 4.84,-2.68 9.717,-5.326c0.163,-0.146 0.173,-0.098 2.317,-1.453Z" style="fill:#c50001;fill-opacity:1;"/><path d="M23.803,170.742c0.826,-0.635 1.662,-0.09 6.572,-0.054c61.485,0.455 151.8,0.059 165,0.001c5.383,-0.024 6.348,-0.838 6.203,0.716c-0.024,0.256 -0.276,-0.014 -2.564,1.937c-0.958,0.232 -0.953,0.171 -1.319,0.398c-1.658,0.881 -1.622,0.824 -3.249,1.805c-36.451,21 -36.531,20.902 -37.446,21.762c-0.867,0.268 -0.789,0.28 -1.584,0.793c-1.581,0.56 -1.467,0.656 -2.952,1.479c-36.329,20.905 -36.409,20.797 -37.457,21.748c-4.714,1.535 -4.597,-0.12 -8.992,-2.512c-8.028,-4.369 -12.641,-7.658 -15.448,-8.692c-0.781,-0.504 -0.704,-0.516 -1.572,-0.798c-1.759,-1.636 -38.28,-22.566 -41.221,-23.975c-0.268,-0.217 -0.536,-0.434 -0.804,-0.651c-17.833,-10.297 -19.791,-11.916 -23.109,-12.741c-0.02,-0.405 -0.039,-0.811 -0.059,-1.216Z" style="fill:#c50001;fill-opacity:0.99;"/><path d="M143.414,17.919c2.156,1.299 2.161,1.303 2.323,1.451c19.677,10.994 19.442,11.305 38.988,22.509c0.195,0.094 1.524,0.731 2.329,1.373c19.164,11.143 19.44,10.729 20.821,12.071c1.565,1.522 0.032,79.415 0.834,102.519c-0.418,0.235 -0.835,0.47 -1.253,0.705c-2.31,-5.694 -86.318,-150.663 -87.69,-152.235c-6.196,-7.099 18.305,9.497 23.648,11.606Z" style="fill:#c50001;fill-opacity:1;"/><path d="M93.056,116.621c0.058,-0.744 0.523,-6.717 2.605,-8.962c0.656,-0.707 5.903,-4.009 4.124,-5.718c-1.014,-0.975 -9.504,-9.13 -1.822,-17.49c12.032,-13.095 33.765,-4.022 32.134,8.921c-0.999,7.927 -8.389,8.289 -3.505,11.682c8.106,5.632 5.62,14.939 4.004,18.167c-6.563,13.106 -36.813,14.184 -37.539,-6.6Z" style="fill:#f1e6e6;"/><path d="M121.554,115.883c-1.325,15.449 -22.394,7.438 -17.309,-3.595c2.461,-5.34 15.448,-8.745 17.309,3.595Z" style="fill:#bf0405;"/><path d="M104.94,91.924c0.192,-0.55 1.519,-4.358 4.909,-5.374c13.454,-4.034 12.773,15.501 2.295,13.469c-7.588,-1.471 -7.239,-3.754 -7.204,-8.095Z" style="fill:#bd0506;"/><path d="M197.695,173.74c-0.082,0.415 -0.165,0.83 -0.247,1.245c-2.098,2.944 -2.744,0.714 -3.002,0.56c1.627,-0.981 1.591,-0.925 3.249,-1.805Z" style="fill:#b70608;fill-opacity:0.14;"/><path d="M155.416,198.1l-0.018,0.842c-1.869,2.842 -2.75,0.742 -2.934,0.637c1.486,-0.822 1.371,-0.919 2.952,-1.479Z" style="fill:#b80507;fill-opacity:0.12;"/><path d="M16.293,157.842c0.416,0.235 0.832,0.469 1.248,0.704l0.104,1.621l-0.709,0.486c-0.849,-1.227 -0.535,-1.295 -0.644,-2.81Z" style="fill:#951416;fill-opacity:0.2;"/><path d="M208.709,157.843c-0.206,2.951 -1.25,2.42 -1.302,2.22c-0.128,-0.489 0.177,-1.026 0.049,-1.515c0.418,-0.235 0.835,-0.47 1.253,-0.705Z" style="fill:#961414;fill-opacity:0.21;"/><path d="M23.803,170.742c0.02,0.405 0.039,0.811 0.059,1.216l-0.121,0.823c-0.058,-0.115 -0.728,-1.432 -0.728,-1.432c-0.132,-1.061 0.783,-0.602 0.79,-0.607Z" style="fill:#991215;fill-opacity:0.12;"/><path d="M19.405,164.03l-0.594,1.367l-0.451,0.731c0.296,-1.18 0.37,-1.108 1.045,-2.098Z" style="fill:#aa0808;fill-opacity:0.39;"/></g></svg>`,
    10: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M46.978,154.695c-2.235,-1.33 -4.281,-1.415 -2.163,-4.961c0.014,-0.023 64.336,-111.659 66.053,-114.717c1.031,-1.836 1.331,-3.248 2.572,-1.509c0.745,1.045 63.376,110.695 65.611,114.516c1.949,3.334 3.275,4.264 -0.066,6.289c-1.68,1.018 -1.707,0.897 -21.232,12.339c-0.749,0.672 -2.134,1.353 -2.331,1.45c-4.363,2.215 -4.281,2.32 -39.552,22.763c-3.554,2.714 -4.165,1.634 -12.873,-3.518c-9.762,-5.776 -11.462,-6.632 -12.49,-7.15c-0.194,-0.099 -1.539,-0.785 -2.318,-1.434c-36.987,-21.792 -37.027,-21.812 -40.391,-23.436c-0.273,-0.21 -0.546,-0.421 -0.819,-0.631Z" style="fill:#4c4397;fill-opacity:1;"/><path d="M78.598,47.934c1.568,-0.634 1.487,-0.706 2.956,-1.48c20.904,-11.016 24.13,-13.839 24.495,-12.318c0.002,0.01 -50.07,87.013 -51.451,89.367c-14.474,24.662 -13.926,27.783 -17.281,25.802c-9.421,-5.563 -9.282,-5.705 -18.787,-11.138c-1.261,-0.714 -1.495,-0.516 -1.919,-1.97c-0.298,-1.02 -0.102,-48.371 -0.085,-52.577c0.012,-2.897 4.819,-4.533 5.721,-5.016c13.803,-7.387 39.351,-21.345 42.767,-23.211c0.49,-0.273 0.979,-0.545 1.469,-0.818c4.272,-2.116 7.355,-3.916 9.745,-5.248c0.76,-0.653 2.169,-1.301 2.369,-1.393Z" style="fill:#4c4297;fill-opacity:1;"/><path d="M179.457,65.867c0.198,0.093 1.577,0.739 2.361,1.369c5.158,2.818 5.025,2.977 10.392,5.467c0.273,0.201 0.547,0.403 0.82,0.604c15.545,8.454 15.399,8.85 15.424,9.528c0.077,2.125 -0.057,47.404 0.073,51.789c0.106,3.587 -4.388,4.322 -9.591,7.915c-0.48,0.289 -0.96,0.578 -1.44,0.867c-11.554,6.643 -11.963,6.655 -12.405,6.036c-1.022,-1.432 -63.074,-110.926 -65.247,-113.929c-4.078,-5.636 2.843,-0.089 27.725,13.254c2.199,1.179 18.726,10.042 27.447,14.817c2.233,1.223 2.135,1.324 4.442,2.283Z" style="fill:#4c4297;fill-opacity:1;"/><path d="M143.2,132.408c-0.52,3.241 -1.678,17.297 -14.576,17.935c-22.366,1.107 -21.025,-37.497 -8.174,-44.076c3.596,-1.841 23.068,-5.903 22.992,20.857c-0.001,0.423 -0.018,0.391 -0.241,5.284Z" style="fill:#eaeaf0;"/><path d="M101.974,112.125c-0.001,10.5 -0.002,21 -0.003,31.5c-0,3.309 1.406,7.188 -6.355,6.072c-3.616,-0.52 -2.181,-5.633 -2.397,-24.82c-0.089,-7.893 -11.124,0.361 -10.939,-7.501c0.13,-5.505 6.971,-0.404 11.614,-8.39c0.3,-0.516 3.163,-5.44 6.923,-2.765c2.319,1.65 1.03,2.258 1.156,5.904Z" style="fill:#eaeaef;"/><path d="M134.295,121.895c0.088,2.013 2.119,19.987 -6.388,21.198c-9.936,1.414 -10.877,-31.22 -0.785,-30.753c6.316,0.292 6.854,7.577 7.173,9.555Z" style="fill:#4c4394;"/></g></svg>`,
    12: `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M66.546,130.072c-5.782,-18.043 -7.566,-22.935 -11.092,-33.806c-1.298,-4 0.216,-3.886 3.634,-6.357c51.897,-37.504 52.454,-39.242 54.408,-38.304c1.807,0.867 50.282,36.637 54.635,39.849c3.405,2.512 1.735,4.196 0.265,8.678c-19.745,60.178 -19.071,61.247 -21.026,61.466c-0.885,0.099 -68.736,0.047 -68.995,0.029c-2.468,-0.177 -4.108,-7.742 -11.829,-31.554Z" style="fill:#2d1c9c;fill-opacity:1;"/><path d="M42.653,179.417c-22.158,-31.232 -26.262,-34.72 -26.178,-38.044c0.336,-13.244 -0.497,-56.988 0.496,-57.634c0.479,-0.311 32.625,9.581 33.521,11.212c0.394,0.717 11.91,36.625 12.36,38.098c8.951,29.298 10.207,29.642 8.484,32.126c-1.442,2.079 -13.03,18.788 -18.574,25.594c-1.518,1.863 -2.624,-1.651 -10.11,-11.353Z" style="fill:#2d1c9c;fill-opacity:1;"/><path d="M120.338,13.243c8.244,2.766 8.195,2.756 16.465,5.345c6.226,2.146 18.046,5.884 19.62,6.382l0.686,0.208c6.766,2.277 6.737,2.217 13.516,4.447c2.881,0.948 6.153,7.593 14.766,18.921c1.16,1.749 1.144,1.743 1.252,1.889c1.603,2.161 17.006,22.927 19.617,27.326c0.999,1.684 -4.075,2.661 -14.575,6.054c-17.032,5.504 -17.523,6.622 -20.38,4.404c-22.074,-17.14 -22.967,-15.853 -44.984,-33.022c-9.667,-7.538 -11.576,-6.656 -11.5,-11.322c0.005,-0.289 -0.012,-30.085 0.02,-30.816c0.107,-2.496 1.408,-0.848 5.496,0.183Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M191.555,166.826l-0.946,1.365c-5.787,7.613 -16.341,23.801 -17.66,23.175c-0.471,-0.224 -0.411,-0.329 -17.614,-24.286c-4.587,-6.389 -1.576,-6.983 0.796,-14.535c1.471,-4.684 17.925,-57.068 19.121,-58.31c0.934,-0.969 12.965,-4.336 31.425,-10.421c3.18,-1.048 1.798,1.806 1.798,41.812c-0,16.087 0.569,16.404 -2.176,20.794c-2.001,3.201 -13.546,18.789 -14.745,20.407Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M163.825,196.731c-0.058,0.038 -0.004,0.011 -2.226,0.823c-7.908,2.568 -7.902,2.442 -15.794,5.087c-0.508,0.213 -1.017,0.426 -1.525,0.639c-4.089,0.921 -13.7,4.291 -17.212,5.409c-13.784,4.947 -14.377,4.781 -15.629,4.43c-1.855,-0.52 -49.753,-16.29 -54.077,-17.713c-2.34,-0.77 -0.177,-2.831 10.148,-16.795c8.603,-11.635 8.253,-12.353 10.117,-12.461c0.806,-0.047 69.393,-0.039 69.747,-0.006c2.597,0.243 12.468,16.022 20.321,26.182c2.387,3.088 -0.22,2.991 -3.87,4.406Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M48.677,36.602c4.617,-5.937 4.282,-6.36 5.744,-6.867c3.858,-1.338 51.954,-16.893 53.911,-17.541c1.387,-0.46 1.85,-0.211 1.851,1.667c0.015,32.434 0.025,32.687 -1.115,33.695c-1.102,0.975 -50.503,37.06 -54.901,40.273c-3.649,2.666 -4.12,1.439 -16.342,-2.547c-11.627,-3.791 -12.912,-3.964 -18.671,-6.187c-0.069,-0.213 -0.961,-0.723 0.202,-2.064c1.103,-1.39 22.374,-30.615 29.322,-40.43Z" style="fill:#2c1c9c;fill-opacity:1;"/><path d="M134.211,109.145c-2.261,10.966 -9.147,9.524 -14.529,15.765c-3.036,3.52 13.301,-0.252 14.752,3.031c1.839,4.16 -1.608,4.7 -2.017,4.764c-0.706,0.111 -20.73,0.241 -21.864,-0.088c-1.965,-0.569 -3.121,-7.189 8.521,-14.942c0.988,-0.658 13.138,-8.75 6.257,-13.459c-3.279,-2.244 -6.927,-0.596 -7.99,2.644c-0.899,2.74 -0.29,4.485 -5.207,4.309c-4.594,-0.164 -0.668,-9.975 3.122,-12.351c4.119,-2.583 9.979,-1.924 12.522,-0.732c7.449,3.492 6.405,10.587 6.432,11.058Z" style="fill:#e7e6f3;"/><path d="M101.875,127.125c-0.127,5.112 -0.607,6.886 -5.572,5.509c-3.941,-1.093 0.383,-20.919 -2.785,-22.311c-3.256,-1.431 -8.01,1.732 -7.425,-4.157c0.219,-2.203 6.11,-1.479 8.449,-4.815c2.091,-2.983 1.947,-3.916 5.576,-3.437c2.101,0.277 1.758,1.352 1.758,29.211Z" style="fill:#eae9f2;"/></g></svg>`,
  };
  const WILD_DIE_ICON_SVG = `<svg width="100%" height="100%" viewBox="0 0 225 225" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g id="Arrière-plan"><path d="M24.168,18.091c3.604,-0.521 3.334,-1.734 6.94,-1.561c6.355,0.304 160.706,-0.71 166.478,0.55c3.501,0.765 10.984,5.419 10.888,15.545c-0.242,25.506 0.562,160.87 -0.477,164.974c-1.262,4.984 -6.653,10.466 -14.129,10.923c-11.258,0.688 -11.203,-0.048 -140.993,-0.048c-24.955,-0 -28.976,1.553 -35.024,-8.731c-1.501,-2.552 -1.325,-2.787 -1.325,-107.119c0,-63.43 -0.185,-63.541 1.31,-67.383c0.343,-0.883 0.203,-0.86 0.237,-1.768c2.08,-1.186 5.193,-4.549 6.096,-5.383Z" style="fill:#f1eddf;fill-opacity:1;"/><path d="M114.356,147.777c-13.091,-1.337 -25.512,-3.701 -27.089,-34.148c-1.054,-20.357 12.168,-42.409 33.76,-36.397c11.852,3.3 17.049,16.019 13.514,17.416c-0.427,0.169 -9.449,1.999 -11.64,-1.444c-0.727,-1.142 -8.122,-12.763 -16.694,-2.759c-3.187,3.719 -8.666,18.854 -1.403,13.676c11.793,-8.408 33.169,-2.123 32.638,19.248c-0.037,1.474 -0.254,10.227 -6.628,17.2c-6.496,7.106 -15.258,7.025 -16.457,7.208Z"/><path d="M123.791,124.838c-3.152,22.563 -29.159,8.762 -19.82,-8.913c4.463,-8.447 20.083,-7.671 19.82,8.913Z" style="fill:#f1eddf;"/></g></svg>`;

  // Palette state: number of dice selected per size, plus whether the Joker die is active
  const counts = { 4: 0, 6: 0, 8: 0, 10: 0, 12: 0 };
  let jokerEnabled = false;

  const dieCellHtml = (faces) => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
      <img class="dice-picker-icon" data-faces="${faces}" src="${svgToDataUri(DIE_ICON_SVG[faces])}" alt="d${faces}" title="d${faces}" style="width:64px;height:64px;cursor:pointer;box-sizing:border-box;border-radius:6px;border:2px solid transparent;transition:border-color 0.15s ease, box-shadow 0.15s ease;" />
      <div style="display:flex;align-items:center;gap:6px;">
        <button type="button" class="dice-picker-minus" data-faces="${faces}" style="line-height:1;padding:2px 8px;">−</button>
        <span class="dice-picker-count" data-faces="${faces}" style="min-width:1.5em;text-align:center;font-size:1.3rem;font-weight:bold;">0</span>
      </div>
    </div>
  `;

  const jokerCellHtml = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
      <img class="dice-picker-icon" data-faces="joker" src="${svgToDataUri(WILD_DIE_ICON_SVG)}" alt="${t("dice.wild_die")}" title="${t("dice.wild_die")}" style="width:64px;height:64px;cursor:pointer;box-sizing:border-box;border-radius:6px;border:2px solid transparent;transition:border-color 0.15s ease, box-shadow 0.15s ease;" />
      <div style="display:flex;align-items:center;gap:6px;">
        <button type="button" class="dice-picker-minus" data-faces="joker" style="line-height:1;padding:2px 8px;">−</button>
        <span class="dice-picker-count" data-faces="joker" style="min-width:1.5em;text-align:center;font-size:1.3rem;font-weight:bold;">0</span>
      </div>
    </div>
  `;

  const dialog = new foundry.applications.api.DialogV2({
    window: { title: t("palette.title") },
    content: `
      <div style="width:520px;">
        <!-- Discreet hint shown while the Joker is active. Its height is always reserved
             (min-height) so the dice do not jump when the text appears or disappears. -->
        <div class="dice-picker-hint" style="min-height:1.3em;padding:0 4px;text-align:center;font-size:0.85rem;font-style:italic;opacity:0.75;"></div>
        <div style="display:flex;gap:16px;justify-content:center;padding:8px 4px;">
          ${DICE_SIZES.map(dieCellHtml).join("")}
          <!-- Thin vertical rule separating the Joker from the regular dice -->
          <div style="width:1px;align-self:stretch;background:currentColor;opacity:0.3;"></div>
          ${jokerCellHtml}
        </div>
      </div>
    `,
    buttons: [
      {
        action: "roll",
        label: t("palette.roll"),
        default: true,
        callback: async () => rollSelectedDice()
      },
      { action: "cancel", label: t("common.cancel") }
    ]
  });

  await dialog.render({ force: true });
  const root = dialog.element;

  // Icon border (reproducing Foundry's native hotbar-slot hover look), implemented with JS
  // listeners rather than a CSS ":hover" rule: a <style> tag placed inside DialogV2 content
  // does not seem to get applied (likely filtered out, same as for chat messages).
  // - hovered icon: orange border (takes priority while the mouse is over the icon)
  // - selected die (counter above 0, or Joker enabled): border kept in another color, so the
  //   selection is visible at a glance without reading the small counters
  // - blocked Joker (see below): dimmed, no border, not-allowed cursor
  // - otherwise: no border
  const HOVER_BORDER_COLOR = "var(--color-border-highlight, #ff6400)";
  const SELECTED_BORDER_COLOR = "#26c6da";

  // In SWADE, the Joker (wild die) is rolled alongside a single trait die: it cannot be
  // combined with several dice. So, the Joker can be added next to at most one other die,
  // and while it is active, selecting a die replaces the previously selected one.
  // Hint shown above the dice: explains why a die cannot be selected / the Joker is unavailable
  const JOKER_ACTIVE_HINT = t("palette.hint_wild_die_active");
  const JOKER_BLOCKED_HINT = t("palette.hint_wild_die_blocked");
  // Notification shown when the user clicks the blocked Joker anyway
  const JOKER_BLOCKED_MESSAGE = t("palette.wild_die_blocked");

  const totalDice = () => DICE_SIZES.reduce((sum, faces) => sum + counts[faces], 0);
  const isJokerBlocked = () => !jokerEnabled && totalDice() >= 2;

  const isSelected = (facesKey) => facesKey === "joker" ? jokerEnabled : counts[facesKey] > 0;

  const applyIconBorder = (icon) => {
    const isJoker = icon.dataset.faces === "joker";
    const blocked = isJoker && isJokerBlocked();
    const color = blocked
      ? null
      : (icon.dataset.hovered === "1"
        ? HOVER_BORDER_COLOR
        : (isSelected(icon.dataset.faces) ? SELECTED_BORDER_COLOR : null));
    icon.style.borderColor = color ?? "transparent";
    icon.style.boxShadow = color ? `0 0 6px ${color}` : "none";
    if (isJoker) {
      icon.style.opacity = blocked ? "0.4" : "1";
      icon.style.cursor = blocked ? "not-allowed" : "pointer";
    }
  };

  // Refreshes every counter and icon (a change on one die can affect the others: the Joker
  // becomes blocked/available, a selected die replaces the previous one).
  const refreshPalette = () => {
    root.querySelectorAll(".dice-picker-count").forEach(el => {
      const facesKey = el.dataset.faces;
      el.textContent = String(facesKey === "joker" ? (jokerEnabled ? 1 : 0) : counts[facesKey]);
    });
    root.querySelectorAll(".dice-picker-icon").forEach(applyIconBorder);
    root.querySelector(".dice-picker-hint").textContent =
      jokerEnabled ? JOKER_ACTIVE_HINT : (isJokerBlocked() ? JOKER_BLOCKED_HINT : "");
  };

  // Updates the state (counts / jokerEnabled) for a given die, then refreshes the palette.
  // Clicking the icon = +1, clicking "−" = -1 (never below 0). The Joker is a plain on/off
  // toggle: only one Joker die is ever rolled per roll.
  // - Joker with 2+ dice selected: refused, with a message
  // - a die added while the Joker is active: replaces the previously selected die, so the
  //   Joker is always rolled with a single die
  const updateCount = (facesKey, delta) => {
    if (facesKey === "joker") {
      if (delta > 0 && isJokerBlocked()) {
        ui.notifications.warn(JOKER_BLOCKED_MESSAGE);
        return;
      }
      jokerEnabled = delta > 0;
    } else if (delta > 0 && jokerEnabled) {
      DICE_SIZES.forEach(faces => counts[faces] = 0);
      counts[facesKey] = 1;
    } else {
      counts[facesKey] = Math.max(0, (counts[facesKey] || 0) + delta);
    }
    refreshPalette();
  };

  root.querySelectorAll(".dice-picker-icon").forEach(icon => {
    icon.addEventListener("mouseenter", () => {
      icon.dataset.hovered = "1";
      applyIconBorder(icon);
    });
    icon.addEventListener("mouseleave", () => {
      delete icon.dataset.hovered;
      applyIconBorder(icon);
    });
    icon.addEventListener("click", () => updateCount(icon.dataset.faces, +1));
  });
  root.querySelectorAll(".dice-picker-minus").forEach(btn => {
    btn.addEventListener("click", () => updateCount(btn.dataset.faces, -1));
  });

  // Builds the formula, rolls the selected dice, and posts the result to chat.
  // Returns false to prevent the palette from closing if nothing was selected.
  async function rollSelectedDice() {
    // One term per die ("1d6x + 1d6x" rather than "2d6x"), so every die gets its own line in
    // the result and its own explosion chain (Foundry appends the explosion results of an
    // "NdX" term after all N dice, which would make it impossible to tell which die
    // exploded). The odds are the same as a single "NdX" term.
    const parts = DICE_SIZES.flatMap(faces => Array.from({ length: counts[faces] }, () => `1d${faces}x[basic-d${faces}]`));
    const combined = parts.join(" + ");

    if (!combined && !jokerEnabled) {
      ui.notifications.warn(t("palette.pick_a_die"));
      return false;
    }

    // With no regular dice selected, the Joker is rolled alone (nothing to compare against);
    // otherwise we keep the higher of the selected dice's total and the Joker alone (the
    // same mechanic as trait-roll.js).
    const formula = jokerEnabled
      ? (combined ? `{${combined},1d6x[basic-wild-die]}kh` : "1d6x[basic-wild-die]")
      : combined;

    const user = game.user;
    const roll = await new Roll(formula).roll();

    if (game.modules.get("dice-so-nice")?.active && game.dice3d) {
      await game.dice3d.showForRoll(roll, user, true, null, false);
    }

    // Splits out the "regular" dice (one line per die) from the optional Joker die,
    // depending on whether the formula used a pool ({...}kh) or not (see the formula
    // comment above).
    let mainDiceTerms = [];
    let jokerDieTerm = null;
    if (jokerEnabled && combined) {
      const pool = roll.terms[0];
      mainDiceTerms = pool.rolls[0].dice;
      jokerDieTerm = pool.rolls[1].dice[0];
    } else if (jokerEnabled) {
      jokerDieTerm = roll.dice[0];
    } else {
      mainDiceTerms = roll.dice;
    }

    // The roll is posted to the chat as data (message flags), not as HTML: start-session.js draws
    // the card from it, with the modifier / difficulty buttons (see its "ROLL CARDS" block).
    const dieData = (type, die) => ({ type, faces: die.faces, results: die.results.map(result => result.result) });

    if (jokerEnabled && mainDiceTerms.length === 1) {
      // A Joker rolled with a single other die is a SWADE trait roll: same card as the
      // trait-roll-*.js macros (difficulty 4 by default, the higher of the two dice is kept).
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ user }),
        content: `<p>${t("roll.trait_fallback", { die: mainDiceTerms[0].faces, total: roll.total })}</p>`,
        flags: {
          world: {
            traitRoll: {
              dice: [dieData("trait", mainDiceTerms[0]), dieData("wild", jokerDieTerm)],
              modifier: 0,
              difficulty: 4
            }
          }
        }
      });
    } else {
      // Any other roll (no Joker, or the Joker alone) is a free roll: all the dice are added up
      // (nothing is compared with a wild die), difficulty 0 by default (none), no raises.
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ user }),
        content: `<p>${t("roll.free_fallback", { total: roll.total })}</p>`,
        flags: {
          world: {
            freeRoll: {
              dice: [
                ...mainDiceTerms.map(die => dieData("die", die)),
                ...(jokerDieTerm ? [dieData("wild", jokerDieTerm)] : [])
              ],
              modifier: 0,
              difficulty: 0
            }
          }
        }
      });
    }

    return true;
  }
})();
