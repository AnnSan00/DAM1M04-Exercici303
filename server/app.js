const express = require('express');
const fs = require('fs');
const path = require('path');
const hbs = require('hbs');
const MySQL = require('./utilsMySQL');

const app = express();
const port = 3000;

// Detectar si estem al Proxmox (si és pm2)
const isProxmox = !!process.env.PM2_HOME;

// Iniciar connexió MySQL
const db = new MySQL();
if (!isProxmox) {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'sakila'
  });
} else {
  db.init({
    host: '127.0.0.1',
    port: 3307,   // IMPORTANT: túnel SSH
    user: 'super',
    password: '1234',
    database: 'sakila'
  });
}

// Static files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Disable cache
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Handlebars
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Helpers
hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('gt', (a, b) => a > b);

// Partials
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Dades comunes
const commonData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
);

/* ---------------------------------------------------------
   RUTA: /
   5 pel·lícules + 5 categories
--------------------------------------------------------- */
app.get('/', async (req, res) => {
  try {
    const movies = await db.query(`
      SELECT film_id, title, release_year
      FROM film
      LIMIT 5;
    `);

    const categories = await db.query(`
      SELECT category_id, name
      FROM category
      LIMIT 5;
    `);

    res.render('index', {
      common: commonData,
      movies: db.table_to_json(movies, {
        film_id: 'number',
        title: 'string',
        release_year: 'number'
      }),
      categories: db.table_to_json(categories, {
        category_id: 'number',
        name: 'string'
      })
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

/* ---------------------------------------------------------
   RUTA: /movies
   15 pel·lícules + actors
--------------------------------------------------------- */
app.get('/movies', async (req, res) => {
  try {
    const films = await db.query(`
      SELECT film_id, title, description, release_year
      FROM film
      LIMIT 15;
    `);

    for (const film of films) {
      const actors = await db.query(`
        SELECT a.first_name, a.last_name
        FROM actor a
        JOIN film_actor fa ON fa.actor_id = a.actor_id
        WHERE fa.film_id = ?
      `, [film.film_id]);

      film.actors = actors;
    }

    res.render('movies', {
      common: commonData,
      movies: films
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

/* ---------------------------------------------------------
   RUTA: /customers
   25 clients + 5 lloguers
--------------------------------------------------------- */
app.get('/customers', async (req, res) => {
  try {
    const customers = await db.query(`
      SELECT customer_id, first_name, last_name, email
      FROM customer
      LIMIT 25;
    `);

    for (const c of customers) {
      const rentals = await db.query(`
        SELECT rental_date, inventory_id
        FROM rental
        WHERE customer_id = ?
        LIMIT 5;
      `, [c.customer_id]);

      c.rentals = rentals;
    }

    res.render('customers', {
      common: commonData,
      customers
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Start server
const httpServer = app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

// Shutdown
process.on('SIGINT', async () => {
  await db.end();
  httpServer.close();
  process.exit(0);
});
