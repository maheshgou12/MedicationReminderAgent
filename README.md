# Medication Reminder Agent

## Overview

A backend Medication Reminder System built using FastAPI, PostgreSQL, and SQLAlchemy.

## Features

* User Registration
* User Login
* Add Medication
* Update Medication
* Delete Medication
* Medication Tracking
* Analytics API
* PostgreSQL Database
* REST APIs

## Tech Stack

* Python
* FastAPI
* PostgreSQL
* SQLAlchemy
* Uvicorn
* pgAdmin

## API Endpoints

### User APIs

* POST /register
* POST /login

### Medication APIs

* POST /add-medication
* GET /medications
* PUT /medications/{id}
* DELETE /medications/{id}

### Tracking APIs

* POST /mark-taken/{id}
* GET /stats

## Database Tables

* users
* medications
* medication_logs

## Run Project

pip install -r requirements.txt

python -m uvicorn main:app --reload

## Author

Mahesh Burra
