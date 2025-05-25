// StarWars API Code - Refatorado com nomes significativos e boas práticas de Clean Code

const http = require('http');
const https = require('https');

let apiCache = {};
let isDebugMode = true;
let requestTimeout = 5000;
let errorCount = 0;

async function fetchFromApi(resourcePath) {
    if (apiCache[resourcePath]) {
        if (isDebugMode) console.log("Using cached data for", resourcePath);
        return apiCache[resourcePath];
    }

    return new Promise((resolve, reject) => {
        let responseData = '';
        const request = https.get(`https://swapi.dev/api/${resourcePath}`, { rejectUnauthorized: false }, (response) => {
            if (response.statusCode >= 400) {
                errorCount++;
                return reject(new Error(`Request failed with status code ${response.statusCode}`));
            }

            response.on('data', (chunk) => { responseData += chunk; });
            response.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    apiCache[resourcePath] = parsedData;
                    resolve(parsedData);
                    if (isDebugMode) {
                        console.log(`Successfully fetched data for ${resourcePath}`);
                        console.log(`Cache size: ${Object.keys(apiCache).length}`);
                    }
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

let lastCharacterId = 1;
let apiCallCount = 0;
let totalDataSize = 0;

async function fetchAndDisplayStarWarsData() {
    try {
        if (isDebugMode) console.log("Starting data fetch...");
        apiCallCount++;

        const characterData = await fetchFromApi('people/' + lastCharacterId);
        totalDataSize += JSON.stringify(characterData).length;
        console.log('Character:', characterData.name);
        console.log('Height:', characterData.height);
        console.log('Mass:', characterData.mass);
        console.log('Birthday:', characterData.birth_year);
        if (characterData.films && characterData.films.length > 0) {
            console.log('Appears in', characterData.films.length, 'films');
        }

        const starshipsData = await fetchFromApi('starships/?page=1');
        totalDataSize += JSON.stringify(starshipsData).length;
        console.log('\nTotal Starships:', starshipsData.count);

        for (let i = 0; i < 3; i++) {
            if (i < starshipsData.results.length) {
                const starship = starshipsData.results[i];
                console.log(`\nStarship ${i+1}:`);
                console.log('Name:', starship.name);
                console.log('Model:', starship.model);
                console.log('Manufacturer:', starship.manufacturer);
                console.log('Cost:', starship.cost_in_credits !== 'unknown' ? starship.cost_in_credits + ' credits' : 'unknown');
                console.log('Speed:', starship.max_atmosphering_speed);
                console.log('Hyperdrive Rating:', starship.hyperdrive_rating);
                if (starship.pilots && starship.pilots.length > 0) {
                    console.log('Pilots:', starship.pilots.length);
                }
            }
        }

        const planetsData = await fetchFromApi('planets/?page=1');
        totalDataSize += JSON.stringify(planetsData).length;
        console.log('\nLarge populated planets:');
        for (const planet of planetsData.results) {
            if (planet.population !== 'unknown' && parseInt(planet.population) > 1000000000 && 
                planet.diameter !== 'unknown' && parseInt(planet.diameter) > 10000) {
                console.log(planet.name, '- Pop:', planet.population, '- Diameter:', planet.diameter, '- Climate:', planet.climate);
                if (planet.films && planet.films.length > 0) {
                    console.log(`  Appears in ${planet.films.length} films`);
                }
            }
        }

        const filmsData = await fetchFromApi('films/');
        totalDataSize += JSON.stringify(filmsData).length;
        const sortedFilms = filmsData.results.sort((filmA, filmB) => new Date(filmA.release_date) - new Date(filmB.release_date));

        console.log('\nStar Wars Films in chronological order:');
        sortedFilms.forEach((film, index) => {
            console.log(`${index + 1}. ${film.title} (${film.release_date})`);
            console.log(`   Director: ${film.director}`);
            console.log(`   Producer: ${film.producer}`);
            console.log(`   Characters: ${film.characters.length}`);
            console.log(`   Planets: ${film.planets.length}`);
        });

        if (lastCharacterId <= 4) {
            const vehicleData = await fetchFromApi('vehicles/' + lastCharacterId);
            totalDataSize += JSON.stringify(vehicleData).length;
            console.log('\nFeatured Vehicle:');
            console.log('Name:', vehicleData.name);
            console.log('Model:', vehicleData.model);
            console.log('Manufacturer:', vehicleData.manufacturer);
            console.log('Cost:', vehicleData.cost_in_credits, 'credits');
            console.log('Length:', vehicleData.length);
            console.log('Crew Required:', vehicleData.crew);
            console.log('Passengers:', vehicleData.passengers);
            lastCharacterId++;
        }

        if (isDebugMode) {
            console.log('\nStats:');
            console.log('API Calls:', apiCallCount);
            console.log('Cache Size:', Object.keys(apiCache).length);
            console.log('Total Data Size:', totalDataSize, 'bytes');
            console.log('Error Count:', errorCount);
        }

    } catch (error) {
        console.error('Error:', error.message);
        errorCount++;
    }
}

const commandLineArgs = process.argv.slice(2);
if (commandLineArgs.includes('--no-debug')) {
    isDebugMode = false;
}
if (commandLineArgs.includes('--timeout')) {
    const timeoutIndex = commandLineArgs.indexOf('--timeout');
    if (timeoutIndex < commandLineArgs.length - 1) {
        requestTimeout = parseInt(commandLineArgs[timeoutIndex + 1]);
    }
}

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(`<!DOCTYPE html><html><head><title>Star Wars API Demo</title></head><body><h1>Star Wars API</h1><p>Open the console to see the data.</p></body></html>`);
    } else if (req.url === '/api') {
        fetchAndDisplayStarWarsData();
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Fetching Star Wars data. Check the console.');
    } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}/`);
});
