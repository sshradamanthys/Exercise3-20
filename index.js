require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
require('./mongo')
const Person = require('./models/person')

const app = express()

app.use(express.json())
app.use(express.static('dist'))
app.use(cors())

morgan.token('body', (req) => JSON.stringify(req.body))
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms :body')
)

app.get('/info', (req, res, next) => {
  Person.find({}).then((persons) =>
    res.send(`
      <div>
        <h1>Phonebook has info for ${persons.length} peoples</h1>
        <h2>${new Date()}</h2>
      </div>
    `)
  )
})

// Data Fetching (GET ALL)
app.get('/api/persons', (_, res, next) =>
  Person.find({})
    .then((persons) => res.json(persons))
    .catch((error) => next(error))
)

// Data Fetching (GET ONE)
app.get('/api/persons/:id', (req, res, next) => {
  Person.findById(req.params.id)
    .then((person) => (person ? res.json(person) : res.status(404).end()))
    .catch((error) => next(error))
})

// Data Fetching (POST)
app.post('/api/persons', (req, res, next) => {
  const body = req.body
  const { name, number } = body

  if (name === undefined) {
    return res.status(400).json({ error: 'name missing' })
  }

  if (number === undefined) {
    return res.status(400).json({ error: 'number missing' })
  }

  const person = new Person({ name, number })

  person
    .save()
    .then((savedPerson) => res.json(savedPerson))
    .catch((error) => next(error))
})

// Data Fetching (DELETE)
app.delete('/api/persons/:id', (req, res, next) =>
  Person.findByIdAndRemove(req.params.id)
    .then(() => res.status(204).end())
    .catch((error) => next(error))
)

app.put('/api/persons/:id', (req, res, next) => {
  const { id } = req.params
  const { name, number } = req.body
  if (!name || !number) {
    throw new Error('name or number is missing')
  }

  const person = { name, number }
  Person.findByIdAndUpdate(id, person, {
    new: true,
    runValidators: true,
    context: 'query'
  })
    .then((updatedPerson) => res.json(updatedPerson))
    .catch((error) => next(error))
})

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'unknown endpoint' })
}

// handler of requests with unknown endpoint
app.use(unknownEndpoint)

const errorHandler = (error, req, res, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return res.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message })
  }

  next(error)
}

// this has to be the last loaded middleware.
app.use(errorHandler)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port: ${PORT}`))
