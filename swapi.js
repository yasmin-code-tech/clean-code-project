const http = require('http');
const https = require('https');

const USER_ARGS_START_INDEX = 2;
const NOT_FOUND = -1;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_ERROR_THRESHOLD = 400;
const MAX_STARSHIPS_DISPLAYED = 3;
const MIN_POPULATION = 1000000000;
const MIN_DIAMETER = 10000;
const MAX_VEHICLE_CHARACTER_ID = 4;
const SERVER_PORT_DEFAULT = 3000;
const REQUEST_TIMEOUT_DEFAULT = 5000;

let apiCache = {};
let isDebugMode = true;
let requestTimeout = REQUEST_TIMEOUT_DEFAULT;
let errorCount = 0;
let lastCharacterId = 1;
let apiCallCount = 0;
let totalDataSize = 0;

function logDebug(message, ...optionalParams) {
    if (isDebugMode) {
        console.log(message, ...optionalParams);
    }
}

async function fetchFromApi(resourcePath) {
    if (apiCache[resourcePath]) {
        logDebug("Using cached data for", resourcePath);
        return apiCache[resourcePath];
    }
    return new Promise((resolve, reject) => {
        let responseData = '';
        const request = https.get(`https://swapi.dev/api/${resourcePath}`, { rejectUnauthorized: false }, (response) => {
            if (response.statusCode >= HTTP_ERROR_THRESHOLD) {
                errorCount++;
                return reject(new Error(`Request failed with status code ${response.statusCode}`));
            }
            response.on('data', (chunk) => { responseData += chunk; });
            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    apiCache[resourcePath] = parsedData;
                    resolve(parsedData);
                    logDebug(`Successfully fetched data for ${resourcePath}`);
                    logDebug(`Cache size: ${Object.keys(apiCache).length}`);
                } catch (error) {
                    errorCount++;
                    reject(error);
                }
            });
        }).on('error', (error) => {
            errorCount++;
            reject(error);
        });
        request.setTimeout(requestTimeout, () => {
            request.abort();
            errorCount++;
            reject(new Error(`Request timeout for ${resourcePath}`));
        });
    });
}

function printCharacterData(characterData) {
    console.log('Character:', characterData.name);
    console.log('Height:', characterData.height);
    console.log('Mass:', characterData.mass);
    console.log('Birthday:', characterData.birth_year);
    if (characterData.films && characterData.films.length > 0) {
        console.log('Appears in', characterData.films.length, 'films');
    }
}

function printStarshipData(starshipsData) {
    console.log('\nTotal Starships:', starshipsData.count);
    starshipsData.results.slice(0, MAX_STARSHIPS_DISPLAYED).forEach((starship, index) => {
        console.log(`\nStarship ${index + 1}:`);
        console.log('Name:', starship.name);
        console.log('Model:', starship.model);
        console.log('Manufacturer:', starship.manufacturer);
        console.log('Cost:', starship.cost_in_credits !== 'unknown' ? starship.cost_in_credits + ' credits' : 'unknown');
        console.log('Speed:', starship.max_atmosphering_speed);
        console.log('Hyperdrive Rating:', starship.hyperdrive_rating);
        if (starship.pilots && starship.pilots.length > 0) {
            console.log('Pilots:', starship.pilots.length);
        }
    });
}

function printLargePlanets(planetsData) {
    console.log('\nLarge populated planets:');
    planetsData.results.forEach((planet) => {
        if (planet.population !== 'unknown' && parseInt(planet.population) > MIN_POPULATION &&
            planet.diameter !== 'unknown' && parseInt(planet.diameter) > MIN_DIAMETER) {
            console.log(planet.name, '- Pop:', planet.population, '- Diameter:', planet.diameter, '- Climate:', planet.climate);
            if (planet.films && planet.films.length > 0) {
                console.log(`  Appears in ${planet.films.length} films`);
            }
        }
    });
}

function printFilmsData(filmsData) {
    const sortedFilms = filmsData.results.sort((filmA, filmB) => new Date(filmA.release_date) - new Date(filmB.release_date));
    console.log('\nStar Wars Films in chronological order:');
    sortedFilms.forEach((film, index) => {
        console.log(`${index + 1}. ${film.title} (${film.release_date})`);
        console.log(`   Director: ${film.director}`);
        console.log(`   Producer: ${film.producer}`);
        console.log(`   Characters: ${film.characters.length}`);
        console.log(`   Planets: ${film.planets.length}`);
    });
}

function printVehicleData(vehicleData) {
    console.log('\nFeatured Vehicle:');
    console.log('Name:', vehicleData.name);
    console.log('Model:', vehicleData.model);
    console.log('Manufacturer:', vehicleData.manufacturer);
    console.log('Cost:', vehicleData.cost_in_credits, 'credits');
    console.log('Length:', vehicleData.length);
    console.log('Crew Required:', vehicleData.crew);
    console.log('Passengers:', vehicleData.passengers);
}

function printStats() {
    logDebug('\nStats:');
    logDebug('API Calls:', apiCallCount);
    logDebug('Cache Size:', Object.keys(apiCache).length);
    logDebug('Total Data Size:', totalDataSize, 'bytes');
    logDebug('Error Count:', errorCount);
}

async function fetchAndDisplayStarWarsData() {
    try {
        logDebug("Starting data fetch...");
        apiCallCount++;

        const characterData = await fetchFromApi(`people/${lastCharacterId}`);
        totalDataSize += JSON.stringify(characterData).length;
        printCharacterData(characterData);

        const starshipsData = await fetchFromApi('starships/?page=1');
        totalDataSize += JSON.stringify(starshipsData).length;
        printStarshipData(starshipsData);

        const planetsData = await fetchFromApi('planets/?page=1');
        totalDataSize += JSON.stringify(planetsData).length;
        printLargePlanets(planetsData);

        const filmsData = await fetchFromApi('films/');
        totalDataSize += JSON.stringify(filmsData).length;
        printFilmsData(filmsData);

        if (lastCharacterId <= MAX_VEHICLE_CHARACTER_ID) {
            const vehicleData = await fetchFromApi(`vehicles/${lastCharacterId}`);
            totalDataSize += JSON.stringify(vehicleData).length;
            printVehicleData(vehicleData);
            lastCharacterId++;
        }

        printStats();

    } catch (error) {
        console.error('Error:', error.message);
        errorCount++;
    }
}

function processCommandLineArgs() {
    const args = process.argv.slice(USER_ARGS_START_INDEX);

    isDebugMode = !args.includes
::contentReference[oaicite:0]{index=0}
} 
