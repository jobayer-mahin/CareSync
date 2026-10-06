import { useEffect, useRef, useState } from "react";
import PatientSidebar from "../../components/PatientSidebar.jsx";
import { api } from "../../lib/api";
import { useAuthGuard } from "../../lib/useAuthGuard";
import { useMyPatient } from "../../lib/useMyPatient";
import { currentDateLong, formatDate, formatTime, initials, loadExternalScript } from "../../lib/ui";
import TopbarActions from "../../components/TopbarActions.jsx";

function matchDepartment(text) { return { dept: "General Medicine", desc: "Your symptoms will be analyzed by the CareSync screening service." }; }

const LOCAL_SYMPTOM_RULES = [
  { condition:"Possible Acute Myocardial Infarction (Heart Attack)",department:"Emergency / Cardiology",urgency:"Emergency",terms:["chest pressure","chest pain","chest discomfort","chest tightness","squeezing","fullness in chest","aching in chest","center chest","left side chest","shortness of breath","sweating","cold sweat","nausea","dizziness","arm pain","left arm pain","shoulder pain","jaw pain","back pain","palpitations"],explanation:"Chest pressure, squeezing, fullness or aching can be a warning sign of a heart attack, especially with shortness of breath, sweating, nausea, dizziness or pain spreading to the arm, shoulder, back or jaw." },
  { condition:"Possible Stroke",department:"Emergency / Neurology",urgency:"Emergency",terms:["face droop","facial droop","facial weakness","arm weakness","leg weakness","one sided weakness","left side weakness","right side weakness","one sided numbness","sudden numbness","speech difficulty","slurred speech","confusion","vision loss","sudden severe headache","worst headache"],explanation:"Sudden facial drooping, one-sided weakness or numbness, speech difficulty, confusion, vision loss or a sudden severe headache can be warning signs of stroke and require emergency assessment." },
  { condition:"Possible Pulmonary Embolism",department:"Emergency / Pulmonology",urgency:"Emergency",terms:["sudden shortness of breath","shortness of breath","chest pain","rapid heartbeat","fast heartbeat","racing heart","coughing blood","blood in cough","cough blood"],explanation:"Sudden shortness of breath, chest pain, rapid heartbeat or coughing blood can occur with a pulmonary embolism and need urgent medical assessment." },
  { condition:"Possible Severe Allergic Reaction (Anaphylaxis)",department:"Emergency / Allergy",urgency:"Emergency",terms:["swollen tongue","tongue swelling","throat swelling","lip swelling","face swelling","fainting","hives","widespread rash"],explanation:"Rapid swelling of the lips, tongue or throat with breathing difficulty, wheezing, faintness or widespread hives can be a severe allergic reaction and requires emergency care." },
  { condition:"Possible Meningitis",department:"Emergency / Infectious Disease",urgency:"Emergency",terms:["fever","severe headache","stiff neck","neck stiffness","confusion","light sensitivity","vomiting","vomit","rash"],explanation:"Fever with a severe headache, stiff neck, confusion, light sensitivity or a rapidly worsening illness can be a warning pattern for meningitis and needs urgent assessment." },
  { condition:"Possible Severe Asthma Exacerbation",department:"Emergency / Pulmonology",urgency:"Emergency",terms:["severe wheezing","wheezing","chest tightness","shortness of breath","cannot breathe"],explanation:"Severe wheezing, chest tightness and difficulty breathing can indicate an asthma flare. Severe or rapidly worsening breathing difficulty needs emergency care." },
  { condition:"Pneumonia",department:"Pulmonology",urgency:"High",terms:["cough","wet cough","phlegm","mucus","fever","chills","shortness of breath","chest pain","chest discomfort","fatigue"],explanation:"Fever, cough, phlegm, chills, chest discomfort or breathing difficulty can occur with pneumonia and should be clinically assessed." },
  { condition:"Acute Bronchitis",department:"Pulmonology",urgency:"Moderate",terms:["cough","persistent cough","mucus","phlegm","chest discomfort","chest congestion","tiredness","fatigue","low fever"],explanation:"A persistent cough, mucus, chest discomfort, tiredness and sometimes fever can occur with acute bronchitis." },
  { condition:"Asthma",department:"Pulmonology",urgency:"Moderate",terms:["wheezing","cough","night cough","chest tightness","shortness of breath"],explanation:"Episodes of wheezing, cough, chest tightness or shortness of breath can occur with asthma and should be evaluated by a clinician." },
  { condition:"Influenza (Flu)",department:"General Medicine",urgency:"Moderate",terms:["fever","high fever","chills","body ache","muscle aches","cough","headache","sore throat","fatigue","tiredness"],explanation:"Fever, chills, cough, body aches, headache, sore throat and fatigue commonly occur with influenza." },
  { condition:"Viral Upper Respiratory Infection / Common Cold",department:"General Medicine",urgency:"Low",terms:["runny nose","blocked nose","stuffy nose","nasal congestion","sneezing","sore throat","cough","mild fever","fatigue"],explanation:"Runny or blocked nose, sneezing, sore throat, cough and mild fatigue commonly occur with a viral upper respiratory infection." },
  { condition:"COVID-19-like Viral Infection",department:"General Medicine",urgency:"Moderate",terms:["fever","cough","sore throat","fatigue","body ache","loss of taste","loss of smell","changed taste","changed smell","shortness of breath"],explanation:"Fever, cough, sore throat, fatigue, body aches and changes in taste or smell can occur with COVID-19 or another viral infection. Testing may be needed." },
  { condition:"Sinusitis",department:"ENT",urgency:"Moderate",terms:["sinus pressure","facial pressure","facial pain","nasal congestion","runny nose","thick nasal discharge","headache","reduced smell","loss of smell"],explanation:"Facial pressure or pain with nasal congestion, thick nasal discharge, headache or reduced smell can occur with sinusitis." },
  { condition:"Allergic Rhinitis",department:"ENT / Allergy",urgency:"Low",terms:["sneezing","runny nose","nasal congestion","itchy eyes","watery eyes","itchy nose","post nasal drip"],explanation:"Sneezing, runny or blocked nose and itchy or watery eyes are common allergy symptoms." },
  { condition:"Migraine",department:"Neurology",urgency:"Moderate",terms:["migraine","throbbing headache","severe headache","headache","nausea","vomiting","light sensitivity","sound sensitivity","visual aura","aura","dizziness"],explanation:"A severe or throbbing headache with nausea, vomiting or sensitivity to light or sound can be consistent with migraine." },
  { condition:"Tension Headache",department:"General Medicine / Neurology",urgency:"Low",terms:["headache","pressure headache","band like headache","neck tension","scalp tenderness","stress","tight neck"],explanation:"A pressure-like or band-like headache with neck or scalp muscle tension can occur with tension headache." },
  { condition:"Gastroenteritis",department:"General Medicine",urgency:"Moderate",terms:["diarrhea","loose stool","watery stool","vomiting","nausea","stomach pain","abdominal pain","stomach cramps","abdominal cramps","fever"],explanation:"Vomiting, diarrhea, abdominal cramps, nausea and sometimes fever commonly occur with gastroenteritis." },
  { condition:"Acid Reflux (GERD)",department:"Gastroenterology",urgency:"Moderate",terms:["heartburn","acid reflux","acid taste","acid in mouth","regurgitation","chest burning","burning chest","indigestion","sour taste"],explanation:"Heartburn, acid taste, regurgitation and burning in the upper abdomen or chest can occur with reflux. New or severe chest pain should be assessed urgently." },
  { condition:"Gastritis / Peptic Ulcer Disease",department:"Gastroenterology",urgency:"Moderate",terms:["upper abdominal pain","upper stomach pain","stomach burning","stomach ache","abdominal pain","nausea","indigestion","bloating","pain after eating"],explanation:"Upper abdominal pain or burning, nausea, indigestion and discomfort after eating can occur with gastritis or peptic ulcer disease." },
  { condition:"Irritable Bowel Syndrome (IBS)",department:"Gastroenterology",urgency:"Moderate",terms:["abdominal pain","stomach pain","bloating","diarrhea","constipation","bowel changes","cramps"],explanation:"Recurring abdominal pain associated with diarrhea, constipation, bloating or changes in bowel habits can occur with IBS." },
  { condition:"Appendicitis",department:"Emergency / General Surgery",urgency:"High",terms:["right lower abdominal pain","lower right abdominal pain","pain lower right","appendix pain","abdominal pain","nausea","vomiting","fever","loss of appetite"],explanation:"Pain that becomes focused in the lower right abdomen, especially with nausea, vomiting or fever, can occur with appendicitis and needs prompt medical assessment." },
  { condition:"Urinary Tract Infection",department:"Urology",urgency:"Moderate",terms:["burning urination","painful urination","burning when urinating","frequent urination","urge to urinate","lower abdominal pain","cloudy urine","blood in urine","fever"],explanation:"Burning or painful urination, frequent urination and lower abdominal discomfort can occur with a urinary tract infection." },
  { condition:"Kidney Stone",department:"Urology",urgency:"High",terms:["kidney pain","flank pain","side pain","severe side pain","groin pain","pain to groin","blood in urine","nausea","vomiting","painful urination"],explanation:"Severe flank or side pain that may radiate toward the groin, sometimes with nausea or blood in urine, can occur with kidney stones." },
  { condition:"Anemia",department:"General Medicine / Hematology",urgency:"Moderate",terms:["fatigue","weakness","tiredness","dizziness","pale skin","shortness of breath","rapid heartbeat"],explanation:"Fatigue, weakness, dizziness, shortness of breath on exertion or pale skin can occur with anemia. Blood testing is needed to confirm the cause." },
  { condition:"Type 2 Diabetes - Possible",department:"Endocrinology",urgency:"Moderate",terms:["excessive thirst","frequent urination","peeing often","increased hunger","weight loss","unexplained weight loss","fatigue","blurred vision"],explanation:"Increased thirst, frequent urination, increased hunger, unexplained weight loss or fatigue can occur with diabetes. Blood glucose testing is required for diagnosis." },
  { condition:"Hypertension - Possible",department:"Cardiology",urgency:"Moderate",terms:["high blood pressure","elevated blood pressure","blood pressure is high","headache","dizziness","blurred vision"],explanation:"High blood pressure usually causes no symptoms. A high reading should be confirmed with proper repeated measurements rather than diagnosed from symptoms alone." },
  { condition:"Conjunctivitis",department:"Ophthalmology",urgency:"Low",terms:["red eye","red eyes","watery eye","watery eyes","eye discharge","sticky eyes","itchy eye","itchy eyes"],explanation:"Red, irritated or watery eyes with discharge can occur with conjunctivitis. Eye pain or vision loss needs prompt assessment." },
  { condition:"Otitis / Ear Infection",department:"ENT",urgency:"Moderate",terms:["ear pain","earache","ear pressure","blocked ear","reduced hearing","hearing loss","ear discharge","fever"],explanation:"Ear pain, reduced hearing, ear pressure or discharge can occur with an ear infection and should be assessed if severe or persistent." },
  { condition:"Dermatitis / Eczema",department:"Dermatology",urgency:"Low",terms:["itchy skin","itching","dry skin","red skin","skin rash","rash","scaly skin","inflamed skin","itchy","scaly"],explanation:"Itchy, dry, inflamed or scaly skin can occur with dermatitis or eczema." },
  { condition:"Urticaria (Hives)",department:"Dermatology / Allergy",urgency:"Moderate",terms:["hives","raised rash","itchy welts","welts","itchy rash","skin swelling"],explanation:"Raised, itchy welts that appear suddenly can occur with hives. Swelling of the tongue or throat or breathing difficulty is an emergency." },
  { condition:"Musculoskeletal Back Pain",department:"Orthopedics",urgency:"Moderate",terms:["back pain","lower back pain","lower back","muscle pain","joint pain","stiffness","back stiffness","neck pain"],explanation:"Back or muscle pain with stiffness can have a musculoskeletal cause. New weakness, numbness, bladder/bowel problems or severe trauma needs urgent assessment." },
  { condition:"Osteoarthritis",department:"Orthopedics / Rheumatology",urgency:"Moderate",terms:["joint pain","knee pain","hip pain","joint stiffness","swollen joint","painful joints","reduced movement"],explanation:"Joint pain, stiffness and reduced movement can occur with osteoarthritis." },
  { condition:"Anxiety / Panic Symptoms",department:"Mental Health",urgency:"Moderate",terms:["panic","panic attack","anxiety","racing heart","rapid heartbeat","trembling","shaking","sweating","dizziness","rapid breathing"],explanation:"Episodes of intense fear with racing heart, trembling, sweating, dizziness or rapid breathing can occur with panic attacks. New chest pain or fainting should be medically assessed." },
  { condition:"Depressive Symptoms",department:"Mental Health",urgency:"Moderate",terms:["low mood","sadness","loss of interest","no interest","sleep problems","poor sleep","oversleeping","low energy","fatigue","loss of appetite"],explanation:"Persistent low mood, loss of interest, sleep or appetite changes and low energy can occur with depression and deserve a professional assessment." },
  { condition:"Thyroid Disorder - Possible",department:"Endocrinology",urgency:"Moderate",terms:["weight gain","weight loss","rapid heartbeat","fatigue","cold intolerance","heat intolerance","constipation","diarrhea","neck swelling","tremor"],explanation:"Changes in weight, heart rate, temperature tolerance, energy, bowel habits or neck swelling can occur with thyroid disorders. Blood testing is needed." },
  { condition:"Dehydration",department:"General Medicine",urgency:"Moderate",terms:["thirst","excessive thirst","dry mouth","dizziness","weakness","dark urine","less urine","reduced urination","heavy sweating"],explanation:"Thirst, dry mouth, dizziness, weakness, reduced urination or dark urine can occur with dehydration, especially after vomiting, diarrhea, fever or heavy sweating." },
  { condition:"Iron Deficiency - Possible",department:"General Medicine / Hematology",urgency:"Moderate",terms:["fatigue","weakness","pale skin","dizziness","shortness of breath","brittle nails","restless legs"],explanation:"Fatigue, weakness, pale skin, dizziness or shortness of breath can occur with iron deficiency. Blood testing is required to confirm it." }
];

function normalizeSymptomText(input) {
  return input.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace("left side of the chest", "left side chest")
    .replace("center of the chest", "center chest")
    .replace("centre of the chest", "center chest")
    .replace("middle of the chest", "center chest")
    .replace("difficulty breathing", "shortness of breath")
    .replace("trouble breathing", "shortness of breath")
    .replace("breathlessness", "shortness of breath")
    .replace("pressure in my chest", "chest pressure")
    .replace("pressure in the chest", "chest pressure")
    .replace("pain in my chest", "chest pain")
    .replace("pain in the chest", "chest pain")
    .replace("throwing up", "vomiting")
    .replace("threw up", "vomiting")
    .replace("high temperature", "fever")
    .replace("body aches", "body ache")
    .replace("weakness on one side", "one sided weakness")
    .replace("weakness on the left side", "left side weakness")
    .replace("weakness on the right side", "right side weakness")
    .replace("difficulty speaking", "speech difficulty")
    .replace("tummy hurts", "abdominal pain")
    .replace("belly hurts", "abdominal pain")
    .replace("stomach hurts", "stomach pain")
    .replace("burning when i pee", "burning urination")
    .replace("burning when i urinate", "burning urination")
    .replace("it burns when i pee", "burning urination")
    .replace("cannot speak", "speech difficulty")
    .replace("belly pain", "abdominal pain")
    .replace("tummy pain", "abdominal pain")
    .replace("stomach ache", "stomach pain")
    .replace("peeing often", "frequent urination")
    .replace("pee a lot", "frequent urination")
    .replace("blocked nose", "nasal congestion")
    .replace("stuffy nose", "nasal congestion")
    .replace("very thirsty", "excessive thirst")
    .replace("dark pee", "dark urine")
    .replace("blood while urinating", "blood in urine")
    .replace("ear ache", "earache")
    .replace("redness of eye", "red eye")
    .replace("redness in eye", "red eye");
}

const CONDITION_ACTIONS = {
  "Possible Acute Myocardial Infarction (Heart Attack)": ["Call emergency services (999 / local emergency number) immediately or go to the nearest ER - do not drive yourself.", "Sit down, stay calm, and loosen tight clothing while waiting for help.", "Chew an aspirin (300 mg) if available and you are not allergic and a doctor/dispatcher advises it.", "Do not eat, drink, or exert yourself until assessed."],
  "Possible Stroke": ["Call emergency services immediately - note the exact time symptoms started (needed for treatment).", "Use the FAST check: Face drooping, Arm weakness, Speech difficulty, Time to call for help.", "Do not give food, drink, or medication by mouth.", "Keep the person safe and lying on their side if they are not fully alert."],
  "Possible Pulmonary Embolism": ["Call emergency services immediately - this can be life-threatening within minutes to hours.", "Rest in the most comfortable breathing position; avoid exertion.", "Do not take blood thinners or other new medication without medical direction."],
  "Possible Severe Allergic Reaction (Anaphylaxis)": ["Call emergency services immediately.", "Use an epinephrine auto-injector (EpiPen) right away if one is available and prescribed.", "Lie flat with legs raised unless breathing is difficult, then sit up slightly.", "Remove/avoid the suspected trigger (food, sting, medication) if known."],
  "Possible Meningitis": ["Seek emergency care immediately - this condition can worsen rapidly.", "Do not wait to see if it improves; note when the fever/headache/stiff neck started.", "Keep the person hydrated and in a quiet, dim room while arranging transport."],
  "Possible Severe Asthma Exacerbation": ["Use a rescue inhaler (e.g. salbutamol) immediately if available and call emergency services if there is no quick improvement.", "Sit upright, loosen tight clothing, and stay as calm as possible.", "Go to the nearest ER if lips/fingertips turn bluish or speaking becomes difficult."],
  "Pneumonia": ["See a doctor promptly for examination and possible chest X-ray - pneumonia often needs antibiotics.", "Rest, stay well hydrated, and monitor temperature.", "Seek urgent care if breathing becomes difficult, lips turn bluish, or confusion develops."],
  "Acute Bronchitis": ["Rest, drink plenty of fluids, and use a humidifier or steam inhalation to ease coughing.", "Over-the-counter pain/fever relief (e.g. paracetamol) can help if needed and not contraindicated.", "See a doctor if cough lasts more than 2-3 weeks, or fever/breathing difficulty develops."],
  "Asthma": ["Use your prescribed inhaler/reliever as directed at the first sign of symptoms.", "Avoid known triggers (smoke, dust, cold air, allergens) where possible.", "See a doctor to review or start an asthma action plan if you don't have one."],
  "Influenza (Flu)": ["Rest, drink plenty of fluids, and use paracetamol/ibuprofen for fever and aches if suitable for you.", "Stay home and away from others while contagious.", "See a doctor if symptoms are severe, you're in a high-risk group, or you don't improve within a week."],
  "Viral Upper Respiratory Infection / Common Cold": ["Rest, stay hydrated, and use saline nasal spray or steam inhalation for congestion.", "Over-the-counter cold remedies can ease symptoms; they usually resolve in 7-10 days.", "See a doctor if fever is high, symptoms worsen after a week, or breathing is affected."],
  "COVID-19-like Viral Infection": ["Take a COVID-19 test if available and isolate from others until you know the result.", "Rest and stay hydrated; monitor oxygen levels/breathing if you have a way to.", "Seek urgent care if you develop shortness of breath, chest pain, or confusion."],
  "Sinusitis": ["Use saline nasal rinses and steam inhalation to help drainage.", "Over-the-counter decongestants or pain relief can help for a few days.", "See a doctor if symptoms last beyond 10 days or are severe, for possible antibiotics."],
  "Allergic Rhinitis": ["Try to identify and avoid the allergen (dust, pollen, pet dander).", "An antihistamine or nasal steroid spray can help control symptoms.", "See a doctor or allergist if symptoms are frequent or affecting your quality of life."],
  "Migraine": ["Rest in a quiet, dark room and apply a cold compress to the head or neck.", "Take your usual migraine/pain medication early in the episode if prescribed.", "See a doctor if this is a new pattern of headache, or it's the worst headache of your life (seek urgent care)."],
  "Tension Headache": ["Rest, stay hydrated, and try gentle neck/shoulder stretching or a warm compress.", "Over-the-counter pain relief can help occasional episodes.", "See a doctor if headaches become frequent, severe, or start interfering with daily life."],
  "Gastroenteritis": ["Sip fluids frequently (oral rehydration solution is ideal) to prevent dehydration.", "Eat bland, easy-to-digest food once tolerated; avoid dairy and fatty foods.", "See a doctor if you can't keep fluids down, see blood, or symptoms last more than 2-3 days."],
  "Acid Reflux (GERD)": ["Avoid large meals, spicy/fatty foods, caffeine and alcohol; don't lie down right after eating.", "Antacids or an over-the-counter acid reducer can give relief.", "See a doctor if symptoms are frequent, severe, or you have trouble swallowing."],
  "Gastritis / Peptic Ulcer Disease": ["Avoid NSAIDs (e.g. ibuprofen), alcohol, spicy food, and smoking, which can worsen symptoms.", "Eat smaller, more frequent meals.", "See a doctor for evaluation, especially if pain is persistent or there is any vomiting of blood or black stools (seek urgent care for those)."],
  "Irritable Bowel Syndrome (IBS)": ["Track food triggers and consider a low-FODMAP approach with a dietitian's guidance.", "Manage stress and stay physically active; both can affect symptoms.", "See a doctor to confirm the diagnosis and rule out other causes, especially if symptoms are new."],
  "Appendicitis": ["Seek prompt medical/emergency care - appendicitis can worsen quickly and may need surgery.", "Do not eat or drink in case surgery is needed, and avoid pain medication that could mask worsening symptoms.", "Go to the ER now if pain is severe or rapidly worsening."],
  "Urinary Tract Infection": ["Drink plenty of water and urinate frequently; avoid holding it in.", "See a doctor soon - a UTI usually needs antibiotics to fully clear.", "Seek urgent care if you develop fever, back pain, or vomiting (possible kidney involvement)."],
  "Kidney Stone": ["Drink plenty of water and use prescribed or over-the-counter pain relief as directed.", "Seek prompt medical care for imaging and pain management, especially if pain is severe.", "Go to the ER if you have fever, can't keep fluids down, or can't urinate."],
  "Anemia": ["See a doctor for blood tests to confirm anemia and identify the cause before starting iron supplements.", "Eat iron-rich foods (leafy greens, red meat, legumes) in the meantime.", "Seek urgent care if you have chest pain, fainting, or severe shortness of breath."],
  "Type 2 Diabetes - Possible": ["See a doctor for a blood glucose/HbA1c test to confirm the diagnosis.", "Reduce sugary and refined-carb foods while awaiting evaluation.", "Seek urgent care for confusion, very high thirst with vomiting, or rapid breathing."],
  "Hypertension - Possible": ["Recheck your blood pressure at rest, seated, on more than one occasion.", "Reduce salt intake, stay active, and limit alcohol.", "See a doctor to confirm the diagnosis and discuss treatment; seek urgent care for readings above 180/120 with symptoms."],
  "Conjunctivitis": ["Avoid touching/rubbing the eyes and wash hands frequently to prevent spread.", "Use a clean, cool compress and avoid sharing towels or pillows.", "See a doctor if there is significant pain, light sensitivity, or vision changes."],
  "Otitis / Ear Infection": ["Use over-the-counter pain relief for discomfort.", "Avoid inserting anything into the ear canal.", "See a doctor, especially for children, persistent pain, discharge, or hearing changes."],
  "Dermatitis / Eczema": ["Moisturize regularly and avoid known irritants (harsh soaps, certain fabrics).", "A short course of over-the-counter hydrocortisone cream can ease flare-ups.", "See a doctor or dermatologist if it's widespread, infected-looking, or not improving."],
  "Urticaria (Hives)": ["An antihistamine can help relieve itching and welts.", "Try to identify and avoid the trigger (food, medication, heat, stress).", "Seek emergency care immediately if you also have throat swelling or breathing difficulty."],
  "Musculoskeletal Back Pain": ["Stay gently active rather than complete bed rest; apply heat or cold as comforting.", "Over-the-counter pain relief and gentle stretching can help.", "See a doctor if there is numbness, weakness, bladder/bowel changes, or pain after injury."],
  "Osteoarthritis": ["Stay active with low-impact exercise (swimming, walking) and maintain a healthy weight.", "Over-the-counter pain relief or topical anti-inflammatories can help.", "See a doctor or physiotherapist for a joint-specific management plan."],
  "Anxiety / Panic Symptoms": ["Practice slow, deep breathing and grounding techniques during an episode.", "Reduce caffeine and get regular sleep/exercise.", "Talk to a doctor or mental health professional, especially if episodes are frequent or distressing."],
  "Depressive Symptoms": ["Reach out to a trusted person and try to keep a basic routine (sleep, meals, light activity).", "Consider speaking with a doctor or mental health professional for proper assessment and support.", "If you have thoughts of self-harm, contact a crisis line or emergency services immediately."],
  "Thyroid Disorder - Possible": ["See a doctor for thyroid function blood tests to confirm the diagnosis.", "Keep a log of symptoms like weight change, heart rate, and energy levels to share with your doctor."],
  "Dehydration": ["Sip water or an oral rehydration solution steadily rather than large amounts at once.", "Rest in a cool place and avoid strenuous activity.", "Seek urgent care if you feel faint, can't keep fluids down, or urinate very little/not at all."],
  "Iron Deficiency - Possible": ["See a doctor for blood tests to confirm iron deficiency before starting supplements.", "Include iron-rich foods (leafy greens, red meat, legumes) and vitamin C to aid absorption."],
  "No clear screening match": ["Describe the symptom's location, how it feels, when it started, and its severity for a clearer screening.", "If symptoms are new, severe, sudden, or rapidly worsening, see a doctor or seek urgent care rather than waiting."],
};

function actionsForCondition(condition) {
  return CONDITION_ACTIONS[condition] || [
    "Consult a doctor for a proper evaluation of this symptom.",
    "Monitor for worsening, new, or severe symptoms and seek urgent care if they occur.",
  ];
}

function localSymptomAnalysis(input) {
  const text = normalizeSymptomText(input);
  const results = LOCAL_SYMPTOM_RULES.map((rule) => {
    const matched = rule.terms.filter((term) => (` ${text} `).includes(` ${term} `));
    const singleRedFlag =
      (rule.condition.includes("Myocardial Infarction") && matched.some((term) => ["chest pain","chest pressure"].includes(term))) ||
      (rule.condition.includes("Stroke") && matched.some((term) => ["one sided weakness","left side weakness","right side weakness","face droop","facial droop"].includes(term))) ||
      (rule.condition.includes("Anaphylaxis") && matched.some((term) => ["throat swelling","tongue swelling","swollen tongue","lip swelling","fainting"].includes(term))) ||
      (rule.condition.includes("Pulmonary Embolism") && matched.some((term) => ["coughing blood","blood in cough"].includes(term))) ||
      (rule.condition.includes("Asthma Exacerbation") && matched.includes("cannot breathe"));
    if (rule.urgency === "Emergency" ? (matched.length < 2 && !singleRedFlag) : matched.length < 2) return null;
    const raw = matched.reduce((sum, term) => sum + (term.includes("chest") ? 35 : 20), 0);
    let score = Math.min(97, 35 + Math.floor(raw / 2) + Math.max(0, matched.length - 1) * 3);
    if (rule.urgency === "Emergency" && matched.length >= 2) score = Math.min(99, score + 8);
    return { ...rule, matchPercentage: score, matchedSymptoms: matched, recommendedActions: actionsForCondition(rule.condition) };
  }).filter(Boolean)
    .sort((a, b) => (b.urgency === "Emergency") - (a.urgency === "Emergency") || b.matchPercentage - a.matchPercentage)
    .slice(0, 5);

  return results.length ? results : [{
    condition: "No clear screening match", matchPercentage: 0, department: "General Medicine", urgency: "Unknown", matchedSymptoms: [],
    explanation: "The description did not match the current screening patterns. Please describe where the symptom is located, how it feels, how long it has been present, and any associated symptoms.",
    recommendedActions: actionsForCondition("No clear screening match"),
  }];
}

export default function PatientDashboardPage() {
  const { ready } = useAuthGuard("PATIENT");
  const { patient, loading: patientLoading } = useMyPatient();

  const [nextAppt, setNextAppt] = useState(null);
  const [unpaid, setUnpaid] = useState({ total: 0, count: 0 });
  const qrRef = useRef(null);

  useEffect(() => {
    if (!ready || patientLoading || !patient) return;

    api
      .getAppointments()
      .then((res) => {
        const mine = (res || [])
          .filter((a) => a.patientId === patient.id)
          .sort((a, b) => {
            const aDate = new Date(`${a.appointmentDate}T${a.appointmentTime || "00:00:00"}`);
            const bDate = new Date(`${b.appointmentDate}T${b.appointmentTime || "00:00:00"}`);
            return aDate - bDate;
          });
        const now = new Date();
        const upcoming = mine.filter(
          (a) => new Date(`${a.appointmentDate}T${a.appointmentTime || "00:00:00"}`) >= now,
        );
        if (upcoming.length > 0) setNextAppt(upcoming[0]);
      })
      .catch(() => {});

    api
      .getInvoices()
      .then((res) => {
        const mine = (res || []).filter((b) => b.patientId === patient.id);
        let total = 0;
        let count = 0;
        mine.forEach((b) => {
          if (b.paymentStatus === "Unpaid" || b.paymentStatus === "Partial") {
            total += Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0));
            count++;
          }
        });
        setUnpaid({ total, count });
      })
      .catch(() => {});
  }, [ready, patientLoading, patient]);

  // Real QR code generation via the qrcodejs CDN library
  useEffect(() => {
    if (!patient || !qrRef.current) return;
    loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js").then(() => {
      if (!window.QRCode || !qrRef.current) return;
      qrRef.current.innerHTML = "";
      new window.QRCode(qrRef.current, {
        text: `PATIENT:${patient.patientCode}|ID:${patient.id}`,
        width: 80,
        height: 80,
        colorDark: "#0d1b2a",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.H,
      });
    });
  }, [patient]);

  // ---- AI symptom checker modal ----
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiPhase, setAiPhase] = useState("idle"); // idle | loading | result
  const [aiResult, setAiResult] = useState(null);

  async function analyzeSymptoms() {
    const symptoms = aiInput.trim();
    if (!symptoms) return;
    setAiPhase("loading");
    setAiResult(null);
    try {
      const response = await api.analyzeSymptoms(symptoms);
      const results = Array.isArray(response) ? response : (response?.results || []);
      if (!results.length) throw new Error("The symptom service returned no screening results.");
      setAiResult({ results, dept: results[0]?.department || "General Medicine", source: "CareSync clinical screening service" });
    } catch (e) {
      // The patient-facing checker remains usable if the backend is temporarily
      // unavailable. This local fallback is the same screening knowledge base,
      // not a claim of an independent medical diagnosis.
      const results = localSymptomAnalysis(symptoms);
      setAiResult({ results, dept: results[0]?.department || "General Medicine", source: "Offline CareSync screening fallback", warning: e.message });
    }
    setAiPhase("result");
  }

  function bookAiApt() {
    setShowAiModal(false);
    window.location.href = "/patient-appointments.html";
  }

  if (!ready) return null;

  return (
    <>
      <PatientSidebar active="dashboard" patient={patient} />

      <div className="main">
        <div className="topbar">
          <div className="page-title">My Dashboard</div>
          <div className="topbar-right">
            <TopbarActions />
            <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--muted)" }}>{currentDateLong()}</span>
          </div>
        </div>

        <div className="content" style={{ padding: "32px" }}>
          <div className="profile-header">
            <div className="profile-avatar">{patient ? initials(patient.firstName, patient.lastName) : "PT"}</div>
            <div className="profile-info">
              <h2>{patient ? `${patient.firstName} ${patient.lastName}` : "Loading Profile..."}</h2>
              {patient && (
                <>
                  <p>
                    <strong>Patient ID:</strong> {patient.patientCode || "N/A"} | <strong>Blood Group:</strong>{" "}
                    {patient.bloodGroup || "Unknown"}
                  </p>
                  <p>
                    <strong>Email:</strong> {patient.email || "N/A"} | <strong>Phone:</strong> {patient.phone || "N/A"}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-title">Next Appointment</div>
              <div className="stat-value">{nextAppt ? formatDate(nextAppt.appointmentDate) : "No Upcoming"}</div>
              <div className="stat-sub">{nextAppt ? formatTime(nextAppt.appointmentTime) : "—"}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Assigned Doctor</div>
              <div className="stat-value">{patient?.assignedDoctorName || "Not Assigned"}</div>
              <div className="stat-sub">{patient?.departmentName || "—"}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Unpaid Bills</div>
              <div className="stat-value">৳{unpaid.total}</div>
              <div className={"stat-sub" + (unpaid.count > 0 ? " danger" : "")} style={unpaid.count === 0 ? { color: "var(--teal)" } : undefined}>
                {unpaid.count} Pending Invoices
              </div>
            </div>
          </div>

          <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="stat-card" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="stat-title">Digital Identity</div>
                <div className="stat-value" style={{ fontSize: "16px", marginTop: "4px" }}>
                  Patient QR Pass
                </div>
                <div className="stat-sub" style={{ marginTop: "8px" }}>
                  Show at reception for instant check-in.
                </div>
              </div>
              <div ref={qrRef} style={{ background: "white", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}></div>
            </div>

            <a
              href="/patient-ehr.html"
              className="stat-card"
              style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textDecoration: "none", color: "inherit" }}
            >
              <div>
                <div className="stat-title">Medical Records</div>
                <div className="stat-value" style={{ fontSize: "16px", marginTop: "4px" }}>
                  EHR Vault
                </div>
                <div className="stat-sub" style={{ marginTop: "8px" }}>
                  View Lab Results &amp; X-Rays
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "32px", opacity: "0.8", color: "var(--teal)" }}>
                  folder_open
                </span>
              </div>
            </a>
          </div>

          <div
            className="ai-banner"
            onClick={() => {
              setShowAiModal(true);
              setAiPhase("idle");
              setAiInput("");
            }}
          >
            <div>
              <h2 style={{ fontFamily: '"Sora", sans-serif', fontSize: "20px", fontWeight: "700", color: "white", marginBottom: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined ai-banner-icon-glow" style={{ fontSize: "26px", color: "white" }}>
                  smart_toy
                </span>{" "}
                CareSync AI Symptom Checker
              </h2>
              <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.9)" }}>
                Not feeling well? Describe your symptoms and our advanced AI will instantly match you with the right specialist.
              </p>
            </div>
            <div
              className="ai-banner-icon-glow"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255, 255, 255, 0.15)", width: "48px", height: "48px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.25)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "white" }}>
                auto_awesome
              </span>
            </div>
          </div>
        </div>
      </div>

      <div id="aiModal" className={"modal-overlay" + (showAiModal ? " show" : "")}>
        <div className="modal" style={{ maxWidth: "500px" }}>
          <div className="modal-header" style={{ borderBottom: "1px solid var(--border)", padding: "18px 24px" }}>
            <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#8b5cf6" }}>
                auto_awesome
              </span>{" "}
              AI Symptom Checker
            </div>
            <button className="modal-close" onClick={() => setShowAiModal(false)}>
              ×
            </button>
          </div>
          <div className="modal-body" style={{ padding: "28px" }}>
            <p style={{ fontSize: "13.5px", color: "var(--muted)", marginBottom: "16px", lineHeight: "1.4" }}>
              Describe your symptoms in detail (e.g. <i>"severe headache and high fever"</i> or{" "}
              <i>"chest pain and high blood pressure"</i>).
            </p>
            <div className="ai-input-wrapper">
              <textarea
                className="ai-textarea"
                rows="4"
                placeholder="Type your symptoms here..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              ></textarea>
            </div>
            <button className="ai-btn-glow" onClick={analyzeSymptoms} disabled={aiPhase === "loading" || !aiInput.trim()} aria-busy={aiPhase === "loading"}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                psychology
              </span>{" "}
              Analyze Symptoms
            </button>

            {aiPhase !== "idle" && (
              <div className="ai-result-panel">
                {aiPhase === "loading" && (
                  <div className="ai-loading-container" style={{ display: "flex" }}>
                    <div className="ai-pulse-ring">
                      <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "#8b5cf6", animation: "rotate 2s linear infinite" }}>
                        psychology
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--muted)", textAlign: "center" }}>
                      Analyzing your symptoms against the CareSync clinical screening knowledge base...
                    </div>
                  </div>
                )}

                {aiPhase === "result" && aiResult && (
                  <div style={{ display: "block" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: "6px" }}>Possible Conditions</div>
                    {(aiResult.results || []).map((r) => (
                      <div key={r.condition} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", background: r.urgency === "Emergency" ? "rgba(220,38,38,.06)" : "transparent", borderRadius: r.urgency === "Emergency" ? "8px" : "0", paddingLeft: r.urgency === "Emergency" ? "10px" : "0", paddingRight: r.urgency === "Emergency" ? "10px" : "0" }}>
                        {r.urgency === "Emergency" && <div style={{ color: "var(--danger)", fontWeight: "800", fontSize: "12px", marginBottom: "5px" }}>EMERGENCY WARNING — seek immediate medical care</div>}
                        <div style={{ display:"flex", justifyContent:"space-between" }}><strong>{r.condition}</strong><strong>{r.matchPercentage}%</strong></div>
                        <div style={{ fontSize: "12px", color:"var(--muted)" }}>{r.department} · {r.urgency} urgency</div>
                        <div style={{ fontSize: "13px", marginTop:4 }}>{r.explanation}</div>
                        {Array.isArray(r.recommendedActions) && r.recommendedActions.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px", color: r.urgency === "Emergency" ? "var(--danger)" : "var(--teal)" }}>
                              What you can do
                            </div>
                            <ul style={{ margin: "4px 0 0", paddingLeft: "18px", fontSize: "13px", color: "var(--slate)" }}>
                              {r.recommendedActions.map((action, i) => (
                                <li key={i} style={{ marginTop: i === 0 ? 0 : 3 }}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                    {aiResult.error && <p style={{ color:"var(--danger)" }}>{aiResult.error}</p>}
                    {aiResult.source && <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: 10 }}>Source: {aiResult.source}</div>}
                    {aiResult.warning && <div style={{ fontSize: "11px", color: "var(--warning, #b45309)", marginTop: 6 }}>Backend unavailable; showing the built-in screening fallback.</div>}
                    <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: 12 }}>This is a symptom-screening aid, not a medical diagnosis. It cannot confirm a disease. Seek urgent medical care for severe, sudden, or rapidly worsening symptoms.</p>
                    <button className="ai-btn-glow" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)" }} onClick={bookAiApt}>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>calendar_month</span> Book Appointment Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
