const http = require('http');
const https = require('https');
const logger = require('./logger');

let apiCache = {};
let requestTimeout = 5000;
let errorCount = 0;
let isDebugMode = true; // default, será configurado abaixo

let lastCharacterId = 1;
let apiCallCount = 0;
let totalDataSize = 0;

// Tratamento padronizado de erros
function handleError(message, rejectFn, error = null) {
    errorCount++;
    const fullMessage = error ? `${message}: ${error.message}` : message;
    logger.error('API Error:', fullMessage);
    rejectFn(new Error(fullMessage));
}

// Função para logs de debug
function logDebug(message) {
    logger.debug(message);
}

// Função para fazer a requisição à API com cache e tratamento de erros
async function fetchFromApi(resourcePath) {
    if (apiCache[resourcePath]) {
        logDebug(`Using cached data for ${resourcePath}`);
        return apiCache[resourcePath];
    }

    return new Promise((resolve, reject) => {
        let responseData = '';

        const url = `https://swapi.dev/api/${resourcePath}`;
        const request = https.get(url, { rejectUnauthorized: false }, (response) => {
            const { statusCode } = response;

            if (statusCode >= 400) {
                return handleError(
                    `Request failed for ${url} with status code ${statusCode}`,
                    reject
                );
            }

            response.on('data', (chunk) => {
                responseData += chunk;
            });

            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    apiCache[resourcePath] = parsedData;
                    logDebug(`Successfully fetched and cached ${resourcePath}`);
                    resolve(parsedData);
                } catch (error) {
                    handleError(`Failed to parse JSON from ${url}`, reject, error);
                }
            });
        });

        request.on('error', (error) => {
            handleError(`Request error for ${url}`, reject, error);
        });

        request.setTimeout(requestTimeout, () => {
            request.abort();
            handleError(`Request timeout for ${url}`, reject);
        });
    });
}

async function fetchAndDisplayStarWarsData() {
    try {
        logger.info("Starting data fetch...");
        apiCallCount++;

        const characterData = await fetchFromApi('people/' + lastCharacterId);
        totalDataSize += JSON.stringify(characterData).length;
        logger.info('Character:', characterData.name);
        logger.info('Height:', characterData.height);
        logger.info('Mass:', characterData.mass);
        logger.info('Birthday:', characterData.birth_year);
        if (characterData.films && characterData.films.length > 0) {
            logger.info('Appears in', characterData.films.length, 'films');
        }

        const starshipsData = await fetchFromApi('starships/?page=1');
        totalDataSize += JSON.stringify(starshipsData).length;
        logger.info('\nTotal Starships:', starshipsData.count);

        for (let i = 0; i < 3; i++) {
            if (i < starshipsData.results.length) {
                const starship = starshipsData.results[i];
                logger.info(`\nStarship ${i + 1}:`);
                logger.info('Name:', starship.name);
                logger.info('Model:', starship.model);
                logger.info('Manufacturer:', starship.manufacturer);
                logger.info(
                    'Cost:',
                    starship.cost_in_credits !== 'unknown'
                        ? starship.cost_in_credits + ' credits'
                        : 'unknown'
                );
                logger.info('Speed:', starship.max_atmosphering_speed);
                logger.info('Hyperdrive Rating:', starship.hyperdrive_rating);
                if (starship.pilots && starship.pilots.length > 0) {
                    logger.info('Pilots:', starship.pilots.length);
                }
            }
        }

        const planetsData = await fetchFromApi('planets/?page=1');
        totalDataSize += JSON.stringify(planetsData).length;
        logger.info('\nLarge populated planets:');
        for (const planet of planetsData.results) {
            if (
                planet.population !== 'unknown' &&
                parseInt(planet.population) > 1000000000 &&
                planet.diameter !== 'unknown' &&
                parseInt(planet.diameter) > 10000
            ) {
                logger.info(
                    planet.name,
                    '- Pop:',
                    planet.population,
                    '- Diameter:',
                    planet.diameter,
                    '- Climate:',
                    planet.climate
                );
                if (planet.films && planet.films.length > 0) {
                    logger.info(`  Appears in ${planet.films.length} films`);
                }
            }
        }

        const filmsData = await fetchFromApi('films/');
        totalDataSize += JSON.stringify(filmsData).length;
        const sortedFilms = filmsData.results.sort(
            (filmA, filmB) =>
                new Date(filmA.release_date) - new Date(filmB.release_date)
        );

        logger.info('\nStar Wars Films in chronological order:');
        sortedFilms.forEach((film, index) => {
            logger.info(`${index + 1}. ${film.title} (${film.release_date})`);
            logger.info(`   Director: ${film.director}`);
            logger.info(`   Producer: ${film.producer}`);
            logger.info(`   Characters: ${film.characters.length}`);
            logger.info(`   Planets: ${film.planets.length}`);
        });

        if (lastCharacterId <= 4) {
            const vehicleData = await fetchFromApi('vehicles/' + lastCharacterId);
            totalDataSize += JSON.stringify(vehicleData).length;
            logger.info('\nFeatured Vehicle:');
            logger.info('Name:', vehicleData.name);
            logger.info('Model:', vehicleData.model);
            logger.info('Manufacturer:', vehicleData.manufacturer);
            logger.info('Cost:', vehicleData.cost_in_credits, 'credits');
            logger.info('Length:', vehicleData.length);
            logger.info('Crew Required:', vehicleData.crew);
            logger.info('Passengers:', vehicleData.passengers);
            lastCharacterId++;
        }

        if (isDebugMode) {
            logger.info('\nStats:');
            logger.info('API Calls:', apiCallCount);
            logger.info('Cache Size:', Object.keys(apiCache).length);
            logger.info('Total Data Size:', totalDataSize, 'bytes');
            logger.info('Error Count:', errorCount);
        }
    } catch (error) {
        logger.error('Error:', error.message);
        errorCount++;
    }
}

// Processa argumentos de linha de comando
const commandLineArgs = process.argv.slice(2);
if (commandLineArgs.includes('--no-debug')) {
    logger.disableDebug();
    isDebugMode = false;
} else {
    logger.enableDebug();
    isDebugMode = true;
}
if (commandLineArgs.includes('--timeout')) {
    const timeoutIndex = commandLineArgs.indexOf('--timeout');
    if (timeoutIndex < commandLineArgs.length - 1) {
        const timeoutArg = parseInt(commandLineArgs[timeoutIndex + 1]);
        if (!isNaN(timeoutArg) && timeoutArg > 0) {
            requestTimeout = timeoutArg;
        }
    }
}

// Servidor HTTP simples para rodar a demo
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
            `<!DOCTYPE html><html><head><title>Star Wars API Demo</title></head><body><h1>Star Wars API</h1><p>Open the console to see the data.</p></body></html>`
        );
    } else if (req.url === '/api') {
        fetchAndDisplayStarWarsData();
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Fetching Star Wars data. Check the console.');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`Server is running at http://localhost:${PORT}/`);
});
