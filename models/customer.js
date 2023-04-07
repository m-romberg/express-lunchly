"use strict";

/** Customer for Lunchly */

const db = require("../db");
const { NotFoundError } = require("../expressError");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`,
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id],
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4
             WHERE id = $5`, [
        this.firstName,
        this.lastName,
        this.phone,
        this.notes,
        this.id,
      ],
      );
    }
  }
  /** Returns string of customer's full name */

  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /** Search for customers */

  static async search(query) {
    const queryWords = query.split(" ");
    const queryWordsCapitalized = queryWords.map(
      word => word[0].toUpperCase() + word.slice(1).toLowerCase()
    );

    let results;
    if (queryWordsCapitalized.length === 1) {
      results = await db.query(
        `SELECT id,
                first_name AS "firstName",
                last_name  AS "lastName",
                phone,
                notes
          FROM customers
          WHERE first_name = $1 OR last_name = $1`,
        [queryWordsCapitalized[0]]
      );
    } else {
      results = await db.query(
        `SELECT id,
                first_name AS "firstName",
                last_name  AS "lastName",
                phone,
                notes
          FROM customers
          WHERE first_name = $1 AND last_name = $2`,
        [queryWordsCapitalized[0], queryWordsCapitalized[1]]
      );
    }

    const customers = results.rows;
    console.log(customers);
    if (customers.length < 1) {
      throw new NotFoundError(`Could not find customer(s) by ${query}`);
    }
    return customers.map(customer => new Customer (customer));
  }

  static async getTopTen() {
    const results = await db.query(
      `SELECT c.id, c.first_name, c.last_name, c.phone, c.notes
              FROM customers AS c
              JOIN reservations AS r
                ON c.id = r.customer_id
              GROUP BY c.id, r.customer_id
              ORDER BY COUNT(r.customer_id) DESC
              LIMIT 10`
    );

    const customers = results.rows;
    return customers.map(customer => new Customer (customer));
  }
}

module.exports = Customer;


SELECT customers.id, customers.first_name, customers.last_name, customers.phone, customers.notes
  FROM customers
  JOIN reservations
  ON customers.id = customer_id
  GROUP BY customers.id, customer_id
  ORDER BY COUNT(customer_id) DESC
  LIMIT 10;