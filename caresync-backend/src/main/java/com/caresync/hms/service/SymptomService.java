package com.caresync.hms.service;

import com.caresync.hms.dto.SymptomResultDTO;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Curated symptom-screening knowledge base for the demo HMS.
 *
 * This service is deliberately a screening aid, not a diagnostic engine.
 * It recognizes common natural-language variants, combines multiple symptoms,
 * prioritizes emergency red flags, and returns possible conditions rather than
 * confirmed diagnoses. It does not claim that the percentages are probabilities.
 */
@Service
public class SymptomService {
    private record Rule(String condition, String department, String explanation,
                        String urgency, Map<String,Integer> symptoms, boolean emergency) {}

    private static final List<Rule> RULES = List.of(
        rule("Possible Acute Myocardial Infarction (Heart Attack)", "Emergency / Cardiology", "Emergency",
            "Chest pressure, squeezing, fullness or aching can be a warning sign of a heart attack, especially with shortness of breath, sweating, nausea, dizziness or pain spreading to the arm, shoulder, back or jaw.", true,
            50, "chest pressure", "chest pain", "chest discomfort", "chest tightness", "squeezing", "fullness in chest", "aching in chest", "center chest", "left side chest", "shortness of breath", "sweating", "cold sweat", "nausea", "dizziness", "arm pain", "left arm pain", "shoulder pain", "jaw pain", "back pain", "palpitations"),
        rule("Possible Stroke", "Emergency / Neurology", "Emergency",
            "Sudden facial drooping, one-sided weakness or numbness, speech difficulty, confusion, vision loss or a sudden severe headache can be warning signs of stroke and require emergency assessment.", true,
            55, "face droop", "facial droop", "facial weakness", "arm weakness", "leg weakness", "one sided weakness", "left side weakness", "right side weakness", "one sided numbness", "sudden numbness", "speech difficulty", "slurred speech", "difficulty speaking", "cannot speak", "confusion", "vision loss", "sudden severe headache", "worst headache"),
        rule("Possible Pulmonary Embolism", "Emergency / Pulmonology", "Emergency",
            "Sudden shortness of breath, chest pain, rapid heartbeat or coughing blood can occur with a pulmonary embolism and need urgent medical assessment.", true,
            55, "sudden shortness of breath", "shortness of breath", "chest pain", "rapid heartbeat", "fast heartbeat", "racing heart", "coughing blood", "blood in cough", "cough blood"),
        rule("Possible Severe Allergic Reaction (Anaphylaxis)", "Emergency / Allergy", "Emergency",
            "Rapid swelling of the lips, tongue or throat with breathing difficulty, wheezing, faintness or widespread hives can be a severe allergic reaction and requires emergency care.", true,
            60, "swollen tongue", "tongue swelling", "throat swelling", "lip swelling", "face swelling", "fainting", "hives", "widespread rash"),
        rule("Possible Meningitis", "Emergency / Infectious Disease", "Emergency",
            "Fever with a severe headache, stiff neck, confusion, light sensitivity or a rapidly worsening illness can be a warning pattern for meningitis and needs urgent assessment.", true,
            55, "fever", "severe headache", "stiff neck", "neck stiffness", "confusion", "light sensitivity", "vomiting", "vomit", "rash"),
        rule("Possible Severe Asthma Exacerbation", "Emergency / Pulmonology", "Emergency",
            "Severe wheezing, chest tightness and difficulty breathing can indicate an asthma flare. Severe or rapidly worsening breathing difficulty needs emergency care.", true,
            50, "severe wheezing", "wheezing", "chest tightness", "shortness of breath", "difficulty breathing", "trouble breathing", "cannot breathe"),
        rule("Pneumonia", "Pulmonology", "High",
            "Fever, cough, phlegm, chills, chest discomfort or breathing difficulty can occur with pneumonia and should be clinically assessed.", false,
            30, "cough", "wet cough", "phlegm", "mucus", "fever", "chills", "shortness of breath", "breathing difficulty", "chest pain", "chest discomfort", "fatigue"),
        rule("Acute Bronchitis", "Pulmonology", "Moderate",
            "A persistent cough, mucus, chest discomfort, tiredness and sometimes fever can occur with acute bronchitis.", false,
            30, "cough", "persistent cough", "mucus", "phlegm", "chest discomfort", "chest congestion", "tiredness", "fatigue", "low fever"),
        rule("Asthma", "Pulmonology", "Moderate",
            "Episodes of wheezing, cough, chest tightness or shortness of breath can occur with asthma and should be evaluated by a clinician.", false,
            35, "wheezing", "cough", "night cough", "chest tightness", "shortness of breath", "breathing difficulty", "trouble breathing"),
        rule("Influenza (Flu)", "General Medicine", "Moderate",
            "Fever, chills, cough, body aches, headache, sore throat and fatigue commonly occur with influenza.", false,
            30, "fever", "high fever", "chills", "body ache", "body aches", "muscle aches", "cough", "headache", "sore throat", "fatigue", "tiredness"),
        rule("Viral Upper Respiratory Infection / Common Cold", "General Medicine", "Low",
            "Runny or blocked nose, sneezing, sore throat, cough and mild fatigue commonly occur with a viral upper respiratory infection.", false,
            25, "runny nose", "blocked nose", "stuffy nose", "nasal congestion", "sneezing", "sore throat", "cough", "mild fever", "fatigue"),
        rule("COVID-19-like Viral Infection", "General Medicine", "Moderate",
            "Fever, cough, sore throat, fatigue, body aches and changes in taste or smell can occur with COVID-19 or another viral infection. Testing may be needed.", false,
            30, "fever", "cough", "sore throat", "fatigue", "body ache", "body aches", "loss of taste", "loss of smell", "changed taste", "changed smell", "shortness of breath"),
        rule("Sinusitis", "ENT", "Moderate",
            "Facial pressure or pain with nasal congestion, thick nasal discharge, headache or reduced smell can occur with sinusitis.", false,
            35, "sinus pressure", "facial pressure", "facial pain", "blocked nose", "nasal congestion", "runny nose", "thick nasal discharge", "headache", "reduced smell", "loss of smell"),
        rule("Allergic Rhinitis", "ENT / Allergy", "Low",
            "Sneezing, runny or blocked nose and itchy or watery eyes are common allergy symptoms.", false,
            30, "sneezing", "runny nose", "blocked nose", "nasal congestion", "itchy eyes", "watery eyes", "itchy nose", "post nasal drip"),
        rule("Migraine", "Neurology", "Moderate",
            "A severe or throbbing headache with nausea, vomiting or sensitivity to light or sound can be consistent with migraine.", false,
            40, "migraine", "throbbing headache", "severe headache", "headache", "nausea", "vomiting", "vomit", "light sensitivity", "sound sensitivity", "visual aura", "aura", "dizziness"),
        rule("Tension Headache", "General Medicine / Neurology", "Low",
            "A pressure-like or band-like headache with neck or scalp muscle tension can occur with tension headache.", false,
            35, "headache", "pressure headache", "band like headache", "neck tension", "scalp tenderness", "stress", "tight neck"),
        rule("Gastroenteritis", "General Medicine", "Moderate",
            "Vomiting, diarrhea, abdominal cramps, nausea and sometimes fever commonly occur with gastroenteritis.", false,
            35, "diarrhea", "loose stool", "watery stool", "vomiting", "vomit", "nausea", "stomach pain", "abdominal pain", "stomach cramps", "abdominal cramps", "fever"),
        rule("Acid Reflux (GERD)", "Gastroenterology", "Moderate",
            "Heartburn, acid taste, regurgitation and burning in the upper abdomen or chest can occur with reflux. New or severe chest pain should be assessed urgently.", false,
            40, "heartburn", "acid reflux", "acid taste", "acid in mouth", "regurgitation", "chest burning", "burning chest", "indigestion", "sour taste"),
        rule("Gastritis / Peptic Ulcer Disease", "Gastroenterology", "Moderate",
            "Upper abdominal pain or burning, nausea, indigestion and discomfort after eating can occur with gastritis or peptic ulcer disease.", false,
            35, "upper abdominal pain", "upper stomach pain", "stomach burning", "stomach ache", "abdominal pain", "nausea", "indigestion", "bloating", "pain after eating"),
        rule("Irritable Bowel Syndrome (IBS)", "Gastroenterology", "Moderate",
            "Recurring abdominal pain associated with diarrhea, constipation, bloating or changes in bowel habits can occur with IBS.", false,
            35, "abdominal pain", "stomach pain", "bloating", "diarrhea", "constipation", "alternating diarrhea and constipation", "bowel changes", "cramps"),
        rule("Appendicitis", "Emergency / General Surgery", "High",
            "Pain that becomes focused in the lower right abdomen, especially with nausea, vomiting or fever, can occur with appendicitis and needs prompt medical assessment.", false,
            55, "right lower abdominal pain", "lower right abdominal pain", "pain lower right", "appendix pain", "abdominal pain", "nausea", "vomiting", "fever", "loss of appetite"),
        rule("Urinary Tract Infection", "Urology", "Moderate",
            "Burning or painful urination, frequent urination and lower abdominal discomfort can occur with a urinary tract infection.", false,
            40, "burning urination", "painful urination", "burning when urinating", "frequent urination", "urge to urinate", "lower abdominal pain", "cloudy urine", "blood in urine", "fever"),
        rule("Kidney Stone", "Urology", "High",
            "Severe flank or side pain that may radiate toward the groin, sometimes with nausea or blood in urine, can occur with kidney stones.", false,
            50, "kidney pain", "flank pain", "side pain", "severe side pain", "groin pain", "pain to groin", "blood in urine", "nausea", "vomiting", "painful urination"),
        rule("Anemia", "General Medicine / Hematology", "Moderate",
            "Fatigue, weakness, dizziness, shortness of breath on exertion or pale skin can occur with anemia. Blood testing is needed to confirm the cause.", false,
            25, "fatigue", "weakness", "tiredness", "dizziness", "pale skin", "shortness of breath", "breathless on exertion", "rapid heartbeat"),
        rule("Type 2 Diabetes - Possible", "Endocrinology", "Moderate",
            "Increased thirst, frequent urination, increased hunger, unexplained weight loss or fatigue can occur with diabetes. Blood glucose testing is required for diagnosis.", false,
            35, "excessive thirst", "very thirsty", "frequent urination", "peeing often", "increased hunger", "weight loss", "unexplained weight loss", "fatigue", "blurred vision"),
        rule("Hypertension - Possible", "Cardiology", "Moderate",
            "High blood pressure usually causes no symptoms. A high reading should be confirmed with proper repeated measurements rather than diagnosed from symptoms alone.", false,
            45, "high blood pressure", "elevated blood pressure", "blood pressure is high", "headache", "dizziness", "blurred vision"),
        rule("Conjunctivitis", "Ophthalmology", "Low",
            "Red, irritated or watery eyes with discharge can occur with conjunctivitis. Eye pain or vision loss needs prompt assessment.", false,
            35, "red eye", "red eyes", "watery eye", "watery eyes", "eye discharge", "sticky eyes", "itchy eye", "itchy eyes"),
        rule("Otitis / Ear Infection", "ENT", "Moderate",
            "Ear pain, reduced hearing, ear pressure or discharge can occur with an ear infection and should be assessed if severe or persistent.", false,
            40, "ear pain", "earache", "ear pressure", "blocked ear", "reduced hearing", "hearing loss", "ear discharge", "fever"),
        rule("Dermatitis / Eczema", "Dermatology", "Low",
            "Itchy, dry, inflamed or scaly skin can occur with dermatitis or eczema.", false,
            35, "itchy skin", "itching", "itchy", "dry skin", "red skin", "skin rash", "rash", "scaly skin", "scaly", "inflamed skin"),
        rule("Urticaria (Hives)", "Dermatology / Allergy", "Moderate",
            "Raised, itchy welts that appear suddenly can occur with hives. Swelling of the tongue or throat or breathing difficulty is an emergency.", false,
            45, "hives", "raised rash", "itchy welts", "welts", "itchy rash", "skin swelling"),
        rule("Musculoskeletal Back Pain", "Orthopedics", "Moderate",
            "Back or muscle pain with stiffness can have a musculoskeletal cause. New weakness, numbness, bladder/bowel problems or severe trauma needs urgent assessment.", false,
            35, "back pain", "lower back pain", "lower back", "muscle pain", "joint pain", "stiffness", "back stiffness", "neck pain"),
        rule("Osteoarthritis", "Orthopedics / Rheumatology", "Moderate",
            "Joint pain, stiffness and reduced movement, especially after activity or with age, can occur with osteoarthritis.", false,
            35, "joint pain", "knee pain", "hip pain", "joint stiffness", "swollen joint", "painful joints", "reduced movement"),
        rule("Anxiety / Panic Symptoms", "Mental Health", "Moderate",
            "Episodes of intense fear with racing heart, trembling, sweating, dizziness or rapid breathing can occur with panic attacks. New chest pain or fainting should be medically assessed.", false,
            25, "panic", "panic attack", "anxiety", "racing heart", "rapid heartbeat", "trembling", "shaking", "sweating", "dizziness", "rapid breathing"),
        rule("Depressive Symptoms", "Mental Health", "Moderate",
            "Persistent low mood, loss of interest, sleep or appetite changes and low energy can occur with depression and deserve a professional assessment.", false,
            30, "low mood", "sadness", "loss of interest", "no interest", "sleep problems", "poor sleep", "oversleeping", "low energy", "fatigue", "loss of appetite"),
        rule("Thyroid Disorder - Possible", "Endocrinology", "Moderate",
            "Changes in weight, heart rate, temperature tolerance, energy, bowel habits or neck swelling can occur with thyroid disorders. Blood testing is needed.", false,
            20, "weight gain", "weight loss", "rapid heartbeat", "fatigue", "cold intolerance", "heat intolerance", "constipation", "diarrhea", "neck swelling", "tremor"),
        rule("Dehydration", "General Medicine", "Moderate",
            "Thirst, dry mouth, dizziness, weakness, reduced urination or dark urine can occur with dehydration, especially after vomiting, diarrhea, fever or heavy sweating.", false,
            30, "thirst", "very thirsty", "dry mouth", "dizziness", "weakness", "dark urine", "less urine", "reduced urination", "heavy sweating"),
        rule("Iron Deficiency - Possible", "General Medicine / Hematology", "Moderate",
            "Fatigue, weakness, pale skin, dizziness or shortness of breath can occur with iron deficiency. Blood testing is required to confirm it.", false,
            25, "fatigue", "weakness", "pale skin", "dizziness", "shortness of breath", "brittle nails", "restless legs")
    );

    private static Rule rule(String condition, String department, String urgency, String explanation,
                             boolean emergency, int weight, String... terms) {
        Map<String,Integer> symptoms = new LinkedHashMap<>();
        for (String term : terms) symptoms.put(term, weight);
        return new Rule(condition, department, explanation, urgency, symptoms, emergency);
    }

    /**
     * "What can the patient do about it" guidance, keyed by condition name.
     * Emergency conditions always lead with an urgent-care instruction.
     * This is general self-care/next-step guidance, not a treatment plan.
     */
    private static final Map<String, List<String>> ACTIONS = Map.ofEntries(
        Map.entry("Possible Acute Myocardial Infarction (Heart Attack)", List.of(
            "Call emergency services (999 / local emergency number) immediately or go to the nearest ER - do not drive yourself.",
            "Sit down, stay calm, and loosen tight clothing while waiting for help.",
            "Chew an aspirin (300 mg) if available and you are not allergic and a doctor/dispatcher advises it.",
            "Do not eat, drink, or exert yourself until assessed.")),
        Map.entry("Possible Stroke", List.of(
            "Call emergency services immediately - note the exact time symptoms started (needed for treatment).",
            "Use the FAST check: Face drooping, Arm weakness, Speech difficulty, Time to call for help.",
            "Do not give food, drink, or medication by mouth.",
            "Keep the person safe and lying on their side if they are not fully alert.")),
        Map.entry("Possible Pulmonary Embolism", List.of(
            "Call emergency services immediately - this can be life-threatening within minutes to hours.",
            "Rest in the most comfortable breathing position; avoid exertion.",
            "Do not take blood thinners or other new medication without medical direction.")),
        Map.entry("Possible Severe Allergic Reaction (Anaphylaxis)", List.of(
            "Call emergency services immediately.",
            "Use an epinephrine auto-injector (EpiPen) right away if one is available and prescribed.",
            "Lie flat with legs raised unless breathing is difficult, then sit up slightly.",
            "Remove/avoid the suspected trigger (food, sting, medication) if known.")),
        Map.entry("Possible Meningitis", List.of(
            "Seek emergency care immediately - this condition can worsen rapidly.",
            "Do not wait to see if it improves; note when the fever/headache/stiff neck started.",
            "Keep the person hydrated and in a quiet, dim room while arranging transport.")),
        Map.entry("Possible Severe Asthma Exacerbation", List.of(
            "Use a rescue inhaler (e.g. salbutamol) immediately if available and call emergency services if there is no quick improvement.",
            "Sit upright, loosen tight clothing, and stay as calm as possible.",
            "Go to the nearest ER if lips/fingertips turn bluish or speaking becomes difficult.")),
        Map.entry("Pneumonia", List.of(
            "See a doctor promptly for examination and possible chest X-ray - pneumonia often needs antibiotics.",
            "Rest, stay well hydrated, and monitor temperature.",
            "Seek urgent care if breathing becomes difficult, lips turn bluish, or confusion develops.")),
        Map.entry("Acute Bronchitis", List.of(
            "Rest, drink plenty of fluids, and use a humidifier or steam inhalation to ease coughing.",
            "Over-the-counter pain/fever relief (e.g. paracetamol) can help if needed and not contraindicated.",
            "See a doctor if cough lasts more than 2-3 weeks, or fever/breathing difficulty develops.")),
        Map.entry("Asthma", List.of(
            "Use your prescribed inhaler/reliever as directed at the first sign of symptoms.",
            "Avoid known triggers (smoke, dust, cold air, allergens) where possible.",
            "See a doctor to review or start an asthma action plan if you don't have one.")),
        Map.entry("Influenza (Flu)", List.of(
            "Rest, drink plenty of fluids, and use paracetamol/ibuprofen for fever and aches if suitable for you.",
            "Stay home and away from others while contagious.",
            "See a doctor if symptoms are severe, you're in a high-risk group, or you don't improve within a week.")),
        Map.entry("Viral Upper Respiratory Infection / Common Cold", List.of(
            "Rest, stay hydrated, and use saline nasal spray or steam inhalation for congestion.",
            "Over-the-counter cold remedies can ease symptoms; they usually resolve in 7-10 days.",
            "See a doctor if fever is high, symptoms worsen after a week, or breathing is affected.")),
        Map.entry("COVID-19-like Viral Infection", List.of(
            "Take a COVID-19 test if available and isolate from others until you know the result.",
            "Rest and stay hydrated; monitor oxygen levels/breathing if you have a way to.",
            "Seek urgent care if you develop shortness of breath, chest pain, or confusion.")),
        Map.entry("Sinusitis", List.of(
            "Use saline nasal rinses and steam inhalation to help drainage.",
            "Over-the-counter decongestants or pain relief can help for a few days.",
            "See a doctor if symptoms last beyond 10 days or are severe, for possible antibiotics.")),
        Map.entry("Allergic Rhinitis", List.of(
            "Try to identify and avoid the allergen (dust, pollen, pet dander).",
            "An antihistamine or nasal steroid spray can help control symptoms.",
            "See a doctor or allergist if symptoms are frequent or affecting your quality of life.")),
        Map.entry("Migraine", List.of(
            "Rest in a quiet, dark room and apply a cold compress to the head or neck.",
            "Take your usual migraine/pain medication early in the episode if prescribed.",
            "See a doctor if this is a new pattern of headache, or it's the worst headache of your life (seek urgent care).")),
        Map.entry("Tension Headache", List.of(
            "Rest, stay hydrated, and try gentle neck/shoulder stretching or a warm compress.",
            "Over-the-counter pain relief can help occasional episodes.",
            "See a doctor if headaches become frequent, severe, or start interfering with daily life.")),
        Map.entry("Gastroenteritis", List.of(
            "Sip fluids frequently (oral rehydration solution is ideal) to prevent dehydration.",
            "Eat bland, easy-to-digest food once tolerated; avoid dairy and fatty foods.",
            "See a doctor if you can't keep fluids down, see blood, or symptoms last more than 2-3 days.")),
        Map.entry("Acid Reflux (GERD)", List.of(
            "Avoid large meals, spicy/fatty foods, caffeine and alcohol; don't lie down right after eating.",
            "Antacids or an over-the-counter acid reducer can give relief.",
            "See a doctor if symptoms are frequent, severe, or you have trouble swallowing.")),
        Map.entry("Gastritis / Peptic Ulcer Disease", List.of(
            "Avoid NSAIDs (e.g. ibuprofen), alcohol, spicy food, and smoking, which can worsen symptoms.",
            "Eat smaller, more frequent meals.",
            "See a doctor for evaluation, especially if pain is persistent or there is any vomiting of blood or black stools (seek urgent care for those).")),
        Map.entry("Irritable Bowel Syndrome (IBS)", List.of(
            "Track food triggers and consider a low-FODMAP approach with a dietitian's guidance.",
            "Manage stress and stay physically active; both can affect symptoms.",
            "See a doctor to confirm the diagnosis and rule out other causes, especially if symptoms are new.")),
        Map.entry("Appendicitis", List.of(
            "Seek prompt medical/emergency care - appendicitis can worsen quickly and may need surgery.",
            "Do not eat or drink in case surgery is needed, and avoid pain medication that could mask worsening symptoms.",
            "Go to the ER now if pain is severe or rapidly worsening.")),
        Map.entry("Urinary Tract Infection", List.of(
            "Drink plenty of water and urinate frequently; avoid holding it in.",
            "See a doctor soon - a UTI usually needs antibiotics to fully clear.",
            "Seek urgent care if you develop fever, back pain, or vomiting (possible kidney involvement).")),
        Map.entry("Kidney Stone", List.of(
            "Drink plenty of water and use prescribed or over-the-counter pain relief as directed.",
            "Seek prompt medical care for imaging and pain management, especially if pain is severe.",
            "Go to the ER if you have fever, can't keep fluids down, or can't urinate.")),
        Map.entry("Anemia", List.of(
            "See a doctor for blood tests to confirm anemia and identify the cause before starting iron supplements.",
            "Eat iron-rich foods (leafy greens, red meat, legumes) in the meantime.",
            "Seek urgent care if you have chest pain, fainting, or severe shortness of breath.")),
        Map.entry("Type 2 Diabetes - Possible", List.of(
            "See a doctor for a blood glucose/HbA1c test to confirm the diagnosis.",
            "Reduce sugary and refined-carb foods while awaiting evaluation.",
            "Seek urgent care for confusion, very high thirst with vomiting, or rapid breathing.")),
        Map.entry("Hypertension - Possible", List.of(
            "Recheck your blood pressure at rest, seated, on more than one occasion.",
            "Reduce salt intake, stay active, and limit alcohol.",
            "See a doctor to confirm the diagnosis and discuss treatment; seek urgent care for readings above 180/120 with symptoms.")),
        Map.entry("Conjunctivitis", List.of(
            "Avoid touching/rubbing the eyes and wash hands frequently to prevent spread.",
            "Use a clean, cool compress and avoid sharing towels or pillows.",
            "See a doctor if there is significant pain, light sensitivity, or vision changes.")),
        Map.entry("Otitis / Ear Infection", List.of(
            "Use over-the-counter pain relief for discomfort.",
            "Avoid inserting anything into the ear canal.",
            "See a doctor, especially for children, persistent pain, discharge, or hearing changes.")),
        Map.entry("Dermatitis / Eczema", List.of(
            "Moisturize regularly and avoid known irritants (harsh soaps, certain fabrics).",
            "A short course of over-the-counter hydrocortisone cream can ease flare-ups.",
            "See a doctor or dermatologist if it's widespread, infected-looking, or not improving.")),
        Map.entry("Urticaria (Hives)", List.of(
            "An antihistamine can help relieve itching and welts.",
            "Try to identify and avoid the trigger (food, medication, heat, stress).",
            "Seek emergency care immediately if you also have throat swelling or breathing difficulty.")),
        Map.entry("Musculoskeletal Back Pain", List.of(
            "Stay gently active rather than complete bed rest; apply heat or cold as comforting.",
            "Over-the-counter pain relief and gentle stretching can help.",
            "See a doctor if there is numbness, weakness, bladder/bowel changes, or pain after injury.")),
        Map.entry("Osteoarthritis", List.of(
            "Stay active with low-impact exercise (swimming, walking) and maintain a healthy weight.",
            "Over-the-counter pain relief or topical anti-inflammatories can help.",
            "See a doctor or physiotherapist for a joint-specific management plan.")),
        Map.entry("Anxiety / Panic Symptoms", List.of(
            "Practice slow, deep breathing and grounding techniques during an episode.",
            "Reduce caffeine and get regular sleep/exercise.",
            "Talk to a doctor or mental health professional, especially if episodes are frequent or distressing.")),
        Map.entry("Depressive Symptoms", List.of(
            "Reach out to a trusted person and try to keep a basic routine (sleep, meals, light activity).",
            "Consider speaking with a doctor or mental health professional for proper assessment and support.",
            "If you have thoughts of self-harm, contact a crisis line or emergency services immediately.")),
        Map.entry("Thyroid Disorder - Possible", List.of(
            "See a doctor for thyroid function blood tests to confirm the diagnosis.",
            "Keep a log of symptoms like weight change, heart rate, and energy levels to share with your doctor.")),
        Map.entry("Dehydration", List.of(
            "Sip water or an oral rehydration solution steadily rather than large amounts at once.",
            "Rest in a cool place and avoid strenuous activity.",
            "Seek urgent care if you feel faint, can't keep fluids down, or urinate very little/not at all.")),
        Map.entry("Iron Deficiency - Possible", List.of(
            "See a doctor for blood tests to confirm iron deficiency before starting supplements.",
            "Include iron-rich foods (leafy greens, red meat, legumes) and vitamin C to aid absorption.")),
        Map.entry("No clear screening match", List.of(
            "Describe the symptom's location, how it feels, when it started, and its severity for a clearer screening.",
            "If symptoms are new, severe, sudden, or rapidly worsening, see a doctor or seek urgent care rather than waiting.")));

    private static List<String> actionsFor(String condition) {
        return ACTIONS.getOrDefault(condition, List.of(
            "Consult a doctor for a proper evaluation of this symptom.",
            "Monitor for worsening, new, or severe symptoms and seek urgent care if they occur."));
    }

    /**
     * Ranking rule (documented business rule):
     *  1. Emergency red flags always come first (patient safety).
     *  2. Everything else is ranked by symptom match percentage (best match first).
     *  3. Ties are broken by clinical urgency (High before Moderate before Low).
     *  4. Any remaining tie keeps the knowledge-base order (the sort is stable, and the more
     *     common conditions are listed first in RULES).
     */
    static final Comparator<SymptomResultDTO> RESULT_ORDER = Comparator
        .comparing((SymptomResultDTO x) -> !"Emergency".equalsIgnoreCase(x.getUrgency()))
        .thenComparing(Comparator.comparingInt(SymptomResultDTO::getMatchPercentage).reversed())
        .thenComparing(Comparator.comparingInt((SymptomResultDTO x) -> urgencyRank(x.getUrgency())).reversed());

    public List<SymptomResultDTO> analyze(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("Please describe at least one symptom.");
        }

        String text = normalize(input);
        List<SymptomResultDTO> results = RULES.stream()
            .map(rule -> score(rule, text))
            .filter(Objects::nonNull)
            .sorted(RESULT_ORDER)
            .limit(8)
            .collect(Collectors.toList());

        // Never let a routine match hide an emergency match.
        List<SymptomResultDTO> emergencies = results.stream()
            .filter(x -> "Emergency".equalsIgnoreCase(x.getUrgency()))
            .toList();
        if (!emergencies.isEmpty()) {
            List<SymptomResultDTO> ordered = new ArrayList<>(emergencies);
            results.stream()
                .filter(x -> !"Emergency".equalsIgnoreCase(x.getUrgency()))
                .limit(Math.max(0, 5 - ordered.size()))
                .forEach(ordered::add);
            results = ordered;
        }

        if (results.isEmpty()) {
            return List.of(new SymptomResultDTO(
                "No clear screening match", 0, "General Medicine",
                "The description did not match the current screening knowledge base. Please describe where the symptom is located, what it feels like, when it started, how severe it is, and any other symptoms. Persistent, severe, sudden or unexplained symptoms should be assessed by a clinician.",
                "Unknown", List.of(), actionsFor("No clear screening match")));
        }
        return results;
    }

    private SymptomResultDTO score(Rule rule, String text) {
        List<String> matched = new ArrayList<>();
        int raw = 0;
        for (Map.Entry<String,Integer> symptom : rule.symptoms().entrySet()) {
            if (containsPhrase(text, symptom.getKey())) {
                matched.add(symptom.getKey());
                raw += symptom.getValue();
            }
        }
        if (matched.isEmpty()) return null;

        // A single common symptom is intentionally not enough to claim a
        // condition. Emergency rules require two findings except for chest
        // pain/pressure, sudden neurologic deficit, or other explicit red
        // flags that are meaningful on their own.
        if (rule.emergency() && matched.size() < 2) {
            boolean singleRedFlag = (rule.condition().contains("Myocardial Infarction") &&
                    matched.stream().anyMatch(s -> s.equals("chest pain") || s.equals("chest pressure"))) ||
                (rule.condition().contains("Stroke") && matched.stream().anyMatch(s ->
                    s.equals("one sided weakness") || s.equals("left side weakness") ||
                    s.equals("right side weakness") || s.equals("face droop") || s.equals("facial droop"))) ||
                (rule.condition().contains("Anaphylaxis") && matched.stream().anyMatch(s ->
                    s.equals("throat swelling") || s.equals("tongue swelling") || s.equals("swollen tongue") || s.equals("lip swelling") || s.equals("fainting"))) ||
                (rule.condition().contains("Pulmonary Embolism") && matched.stream().anyMatch(s ->
                    s.equals("coughing blood") || s.equals("blood in cough"))) ||
                (rule.condition().contains("Asthma Exacerbation") && matched.stream().anyMatch(s -> s.equals("cannot breathe")));
            if (!singleRedFlag) return null;
        }
        if (!rule.emergency() && matched.size() < 2) return null;

        // Scores are screening-confidence indicators, not probabilities.
        int score = Math.min(97, 35 + raw / 2 + Math.max(0, matched.size() - 1) * 3);
        if (rule.emergency() && matched.size() >= 2) score = Math.min(99, score + 8);
        return new SymptomResultDTO(rule.condition(), score, rule.department(), rule.explanation(), rule.urgency(), matched, actionsFor(rule.condition()));
    }

    private static String normalize(String input) {
        String text = input.toLowerCase(Locale.ROOT)
            .replace('’', '\'')
            .replaceAll("[^a-z0-9\\s]", " ")
            .replaceAll("\\s+", " ")
            .trim();

        String[][] aliases = {
            {"left side of the chest", "left side chest"}, {"right side of the chest", "right side chest"},
            {"center of the chest", "center chest"}, {"centre of the chest", "center chest"}, {"middle of the chest", "center chest"},
            {"difficulty breathing", "shortness of breath"}, {"trouble breathing", "shortness of breath"}, {"hard to breathe", "shortness of breath"}, {"breathlessness", "shortness of breath"},
            {"pressure in my chest", "chest pressure"}, {"pressure in the chest", "chest pressure"}, {"pain in my chest", "chest pain"}, {"pain in the chest", "chest pain"},
            {"tightness in my chest", "chest tightness"}, {"tightness in the chest", "chest tightness"},
            {"throwing up", "vomiting"}, {"threw up", "vomiting"}, {"feel like vomiting", "nausea"}, {"high temperature", "fever"},
            {"body aches", "body ache"}, {"muscle aches", "muscle aches"}, {"weakness on one side", "one sided weakness"},
            {"weakness on the left side", "left side weakness"}, {"weakness on the right side", "right side weakness"},
            {"difficulty speaking", "speech difficulty"}, {"cannot speak", "speech difficulty"}, {"belly pain", "abdominal pain"}, {"tummy pain", "abdominal pain"}, {"tummy hurts", "abdominal pain"}, {"belly hurts", "abdominal pain"},
            {"stomach ache", "stomach pain"}, {"stomach hurts", "stomach pain"}, {"peeing often", "frequent urination"}, {"pee a lot", "frequent urination"},
            {"burning when i pee", "burning urination"}, {"burning when i urinate", "burning urination"}, {"it burns when i pee", "burning urination"}, {"need to pee often", "frequent urination"}, {"need to urinate often", "frequent urination"},
            {"runny nose and sneezing", "runny nose sneezing"}, {"blocked nose", "nasal congestion"}, {"stuffy nose", "nasal congestion"},
            {"very thirsty", "excessive thirst"}, {"dark pee", "dark urine"}, {"blood while urinating", "blood in urine"},
            {"ear ache", "earache"}, {"redness of eye", "red eye"}, {"redness in eye", "red eye"}
        };
        for (String[] alias : aliases) text = text.replace(alias[0], alias[1]);
        return text.replaceAll("\\s+", " ").trim();
    }

    private static boolean containsPhrase(String text, String phrase) {
        String p = phrase.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        return (" " + text + " ").contains(" " + p + " ");
    }

    private static int urgencyRank(String urgency) {
        return switch (urgency.toLowerCase(Locale.ROOT)) {
            case "emergency" -> 4;
            case "high" -> 3;
            case "moderate" -> 2;
            case "low" -> 1;
            default -> 0;
        };
    }
}
