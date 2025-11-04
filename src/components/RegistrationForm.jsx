import React, { useState, useRef } from 'react'
import './RegistrationForm.css'
export default function RegistrationForm({ onComplete }) {
    const taskStartTime = useRef(new Date().toISOString())
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        age: '',
        sex: 'Male',
        consent: false,
        sleepiness: '0',
        feeling: '0',
        satiety: '0',
    })
    const [errors, setErrors] = useState({})

    function handleChange(e) {
        const { name, value, type, checked } = e.target
        setForm((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }))
    }

    function validate() {
        const errs = {}
        if (!form.fullName.trim()) errs.fullName = 'Full name is required.'
        if (!form.email.trim()) errs.email = 'Email is required.'
        else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = 'Enter a valid email.'
        if (!form.consent) errs.consent = 'You must consent to participate.'
        return errs
    }

    function handleSubmit(e) {
        e.preventDefault()
        const errs = validate()
        setErrors(errs)
        if (Object.keys(errs).length === 0) {
            // Create data package with timestamps
            const completionTime = new Date().toISOString()
            const dataPackage = {
                id: form.email.split('@')[0] + '_' + Date.now(),
                ...form,
                startedAt: taskStartTime.current,
                completedAt: completionTime,
                duration: new Date(completionTime) - new Date(taskStartTime.current),
                trialData: []
            }

            console.log('Registration data:', dataPackage)
            // call parent to proceed to next task if provided
            if (typeof onComplete === 'function') {
                onComplete(dataPackage)
            } else {
                alert('Thanks — your information was recorded. You may begin the cognitive tests.')
            }
        }
    }

    return (
        <div className="reg-container">
            <form onSubmit={handleSubmit} className="reg-card" aria-labelledby="registration-heading">
                <div className="reg-header">
                    <div>
                        <h2 id="registration-heading" className="reg-title">Participant Information</h2>
                        <p className="reg-sub">Please provide your details to begin the cognitive tests</p>
                    </div>
                </div>

                <div className="reg-grid">
                    <label className="reg-field">
                        <span className="reg-label">Full Name</span>
                        <input name="fullName" value={form.fullName} onChange={handleChange} className="reg-input" placeholder="Jane Doe" />
                        {errors.fullName && <p className="reg-error">{errors.fullName}</p>}
                    </label>

                    <label className="reg-field">
                        <span className="reg-label">Email Address</span>
                        <input name="email" type="email" value={form.email} onChange={handleChange} className="reg-input" placeholder="name@example.com" />
                        {errors.email && <p className="reg-error">{errors.email}</p>}
                    </label>

                    <div className="reg-twocol">
                        <label className="reg-field">
                            <span className="reg-label">Age</span>
                            <input name="age" type="number" min="0" value={form.age} onChange={handleChange} className="reg-input" />
                        </label>

                        <label className="reg-field">
                            <span className="reg-label">Sex assigned at birth</span>
                            <select name="sex" value={form.sex} onChange={handleChange} className="reg-select">
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </label>
                    </div>

                    <fieldset className="reg-fieldset">
                        <legend className="reg-legend">Current State Assessment</legend>
                        <p className="reg-note">Please rate each item on a scale of 0-5 (0 = low, 5 = high)</p>

                        <div className="reg-grid-3">
                            <label>
                                <span className="reg-label small">Sleepiness</span>
                                <select name="sleepiness" value={form.sleepiness} onChange={handleChange} className="reg-select">
                                    <option value="0">0</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                </select>
                                <p className="reg-help">0 = Fully awake, 5 = Extremely sleepy</p>
                            </label>

                            <label>
                                <span className="reg-label small">How are you feeling now?</span>
                                <select name="feeling" value={form.feeling} onChange={handleChange} className="reg-select">
                                    <option value="0">0</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                </select>
                                <p className="reg-help">0 = Very bad, 5 = Excellent</p>
                            </label>

                            <label>
                                <span className="reg-label small">Satiety</span>
                                <select name="satiety" value={form.satiety} onChange={handleChange} className="reg-select">
                                    <option value="0">0</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                </select>
                                <p className="reg-help">0 = Hungry, 5 = Full/Content</p>
                            </label>
                        </div>
                    </fieldset>

                    <label className="reg-consent">
                        <input name="consent" type="checkbox" checked={form.consent} onChange={handleChange} />
                        <span className="reg-consent-text">I consent to participate in these cognitive tests and understand that my data will be used for research purposes.</span>
                    </label>
                    {errors.consent && <p className="reg-error">{errors.consent}</p>}
                </div>

                <div className="reg-actions">
                    <button type="submit" className="reg-btn-primary">Begin Cognitive Tests</button>
                    <button type="button" onClick={() => setForm({ fullName: '', email: '', age: '', sex: 'Male', consent: false, sleepiness: '0', feeling: '0', satiety: '0' })} className="reg-btn-reset">Reset</button>
                </div>
            </form>
        </div>
    )
}
