const https = require("https");

const USER_ARGS_START_INDEX = 2;

const HTTP_ERROR_THRESHOLD = 400;
const MAX_STARSHIPS_DISPLAYED = 3;
const MIN_POPULATION = 1000000000;
const MIN_DIAMETER = 10000;
const MAX_VEHICLE_CHARACTER_ID = 4;
const REQUEST_TIMEOUT_DEFAULT = 5000;

const apiCache = {};
let isDebugMode = true;
const requestTimeout = REQUEST_TIMEOUT_DEFAULT;
let errorCount = 0;
let lastCharacterId = 1;
let apiCallCount = 0;
let totalDataSize = 0;

function logDebug(message, ...optionalParams) {
    if (isDebugMode) {
        console.log(message, ...optionalParams);
    }
}

// ==== Funções relacionadas ao cache ====

function isCached(resourcePath) {
    return !!apiCache[resourcePath];
}

function getCachedData(resourcePath) {
    logDebug("Using cached data for", resourcePath);
    return apiCache[resourcePath];
}

function cacheData(resourcePath, data) {
    apiCache[resourcePath] = data;
    logDebug(`Successfully fetched data for ${resourcePath}`);
    logDebug(`Cache size: ${Object.keys(apiCache).length}`);
}

// ==== Funções auxiliares para a requisição ====

function handleResponseStatus(response, reject) {
    if (response.statusCode >= HTTP_ERROR_THRESHOLD) {
        errorCount++;
        reject(new Error(`Request failed with status code ${response.statusCode}`));
        return false;
    }
    return true;
}

function parseResponseData(responseData, resourcePath, resolve, reject) {
    try {
        const parsedData = JSON.parse(responseData);
        cacheData(resourcePath, parsedData);
        resolve(parsedData);
    } catch (error) {
        errorCount++;
        reject(error);
    }
}

function createRequest(resourcePath, resolve, reject) {
    let responseData = "";
    const request = https.get(
        `https://swapi.dev/api/${resourcePath}`,
        { rejectUnauthorized: false },
        (response) => {
            if (!handleResponseStatus(response, reject)) return;

            response.on("data", (chunk) => {
                responseData += chunk;
            });
            response.on("end", () => {
                parseResponseData(responseData, resourcePath, resolve, reject);
            });
        }
    );

    request.on("error", (error) => {
        errorCount++;
        reject(error);
    });

    request.setTimeout(requestTimeout, () => {
        request.abort();
        errorCount++;
        reject(new Error(`Request timeout for ${resourcePath}`));
    });
}

// ==== Função principal refatorada de fetchFromApi ====

async function fetchFromApi(resourcePath) {
    if (isCached(resourcePath)) {
        return getCachedData(resourcePath);
    }
    return new Promise((resolve, reject) => {
        createRequest(resourcePath, resolve, reject);
    });
}

// ==== Funções para impressão dos dados ====

function printCharacterData(characterData) {
    console.log("Character:", characterData.name);
    console.log("Height:", characterData.height);
    console.log("Mass:", characterData.mass);
    console.log("Birthday:", characterData.birth_year);
    if (characterData.films && characterData.films.length > 0) {
        console.log("Appears in", characterData.films.length, "films");
    }
}

function printStarshipData(starshipsData) {
    console.log("\nTotal Starships:", starshipsData.count);
    starshipsData.results.slice(0, MAX_STARSHIPS_DISPLAYED).forEach((starship, index) => {
        console.log(`\nStarship ${index + 1}:`);
        console.log("Name:", starship.name);
        console.log("Model:", starship.model);
        console.log("Manufacturer:", starship.manufacturer);
        console.log(
            "Cost:",
            starship.cost_in_credits !== "unknown"
                ? `${starship.cost_in_credits} credits`
                : "unknown"
        );
        console.log("Speed:", starship.max_atmosphering_speed);
        console.log("Hyperdrive Rating:", starship.hyperdrive_rating);
        if (starship.pilots && starship.pilots.length > 0) {
            console.log("Pilots:", starship.pilots.length);
        }
    });
}

function isLargeAndPopulated(planet) {
    const population = parseInt(planet.population);
    const diameter = parseInt(planet.diameter);
    return (
        planet.population !== "unknown" &&
        population > MIN_POPULATION &&
        planet.diameter !== "unknown" &&
        diameter > MIN_DIAMETER
    );
}

function printPlanetDetails(planet) {
    console.log(
        planet.name,
        "- Pop:", planet.population,
        "- Diameter:", planet.diameter,
        "- Climate:", planet.climate
    );
    if (planet.films?.length > 0) {
        console.log(`  Appears in ${planet.films.length} films`);
    }
}

function printLargePlanets(planetsData) {
    console.log("\nLarge populated planets:");
    planetsData.results.forEach((planet) => {
        if (isLargeAndPopulated(planet)) {
            printPlanetDetails(planet);
        }
    });
}


function printFilmsData(filmsData) {
    const sortedFilms = filmsData.results.sort(
        (filmA, filmB) => new Date(filmA.release_date) - new Date(filmB.release_date)
    );

    console.log("\nStar Wars Films in chronological order:");
    sortedFilms.forEach((film, index) => {
        console.log(`${index + 1}. ${film.title} (${film.release_date})`);
        console.log(`   Director: ${film.director}`);
        console.log(`   Producer: ${film.producer}`);
        console.log(`   Characters: ${film.characters.length}`);
        console.log(`   Planets: ${film.planets.length}`);
    });
}

function printVehicleData(vehicleData) {
    console.log("\nFeatured Vehicle:");
    console.log("Name:", vehicleData.name);
    console.log("Model:", vehicleData.model);
    console.log("Manufacturer:", vehicleData.manufacturer);
    console.log("Cost:", vehicleData.cost_in_credits, "credits");
    console.log("Length:", vehicleData.length);
    console.log("Crew Required:", vehicleData.crew);
    console.log("Passengers:", vehicleData.passengers);
}

function printStats() {
    logDebug("\nStats:");
    logDebug("API Calls:", apiCallCount);
    logDebug("Cache Size:", Object.keys(apiCache).length);
    logDebug("Total Data Size:", totalDataSize, "bytes");
    logDebug("Error Count:", errorCount);
}

// ==== Funções auxiliares para tratar dados ====

async function handleCharacterData() {
    const characterData = await fetchFromApi(`people/${lastCharacterId}`);
    totalDataSize += JSON.stringify(characterData).length;
    printCharacterData(characterData);
}

async function handleStarshipsData() {
    const starshipsData = await fetchFromApi("starships/?page=1");
    totalDataSize += JSON.stringify(starshipsData).length;
    printStarshipData(starshipsData);
}

async function handlePlanetsData() {
    const planetsData = await fetchFromApi("planets/?page=1");
    totalDataSize += JSON.stringify(planetsData).length;
    printLargePlanets(planetsData);
}

async function handleFilmsData() {
    const filmsData = await fetchFromApi("films/");
    totalDataSize += JSON.stringify(filmsData).length;
    printFilmsData(filmsData);
}

async function handleVehicleData() {
    const vehicleData = await fetchFromApi(`vehicles/${lastCharacterId}`);
    totalDataSize += JSON.stringify(vehicleData).length;
    printVehicleData(vehicleData);
}

// ==== Função principal refatorada ====

async function fetchAndDisplayStarWarsData() {
    try {
        logDebug("Starting data fetch...");
        apiCallCount++;

        await handleCharacterData();
        await handleStarshipsData();
        await handlePlanetsData();
        await handleFilmsData();

        if (lastCharacterId <= MAX_VEHICLE_CHARACTER_ID) {
            await handleVehicleData();
            lastCharacterId++;
        }

        printStats();

    } catch (error) {
        console.error("Error:", error.message);
        errorCount++;
    }
}

function processCommandLineArgs() {
    const args = process.argv.slice(USER_ARGS_START_INDEX);

    isDebugMode = !args.includes("--no-debug");

    // Aqui você pode adicionar mais processamento de argumentos se precisar
}

// Processa os argumentos de linha de comando ao iniciar
processCommandLineArgs();

// Exporte as funções, ou execute o script conforme sua necessidade
// fetchAndDisplayStarWarsData();

module.exports = {
    fetchAndDisplayStarWarsData,
    fetchFromApi,
    // Exportar outras funções se desejar
};
