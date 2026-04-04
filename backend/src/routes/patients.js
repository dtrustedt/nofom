// backend/src/routes/patients.js
'use strict'

const express         = require('express')
const { v4: uuidv4 }  = require('uuid')
const supabase        = require('../db/supabase')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { local_id, age_months, sex, guardian_name, facility_id } = req.body

    if (!age_months) {
      return res.status(400).json({ error: 'age_months is required' })
    }

    const { data, error } = await supabase
      .from('patients')
      .upsert({
        local_id:      local_id || uuidv4(),
        age_months:    Number(age_months),
        sex:           sex || 'unknown',
        guardian_name: guardian_name || null,
        facility_id:   facility_id || req.worker?.facility_id || null,
        created_by:    req.worker?.id || null,
        synced_at:     new Date().toISOString()
      },
      { onConflict: 'local_id' })
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) { next(err) }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router
