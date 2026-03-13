import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const exercises = [
  // Chest
  { name: 'Bench press', muscleGroups: ['Chest', 'Shoulders', 'Triceps'], equipment: 'Barbell', description: 'Lie on a flat bench, lower a barbell to your chest, then press it back up to full arm extension.' },
  { name: 'Incline bench press', muscleGroups: ['Chest', 'Shoulders', 'Triceps'], equipment: 'Barbell', description: 'Performed on an inclined bench to target the upper chest and anterior deltoids.' },
  { name: 'Decline bench press', muscleGroups: ['Chest', 'Triceps'], equipment: 'Barbell', description: 'On a decline bench, press a barbell from lower chest level to emphasise the lower pectoral fibres.' },
  { name: 'Dumbbell fly', muscleGroups: ['Chest'], equipment: 'Dumbbell', description: 'Lying flat, arc dumbbells out wide and back together over the chest to stretch and contract the pectorals.' },
  { name: 'Incline dumbbell press', muscleGroups: ['Chest', 'Shoulders'], equipment: 'Dumbbell', description: 'Press dumbbells upward on an incline bench, emphasising the upper pectoral and anterior deltoid.' },
  { name: 'Cable fly', muscleGroups: ['Chest'], equipment: 'Cable machine', description: 'Stand between two cable pulleys and bring the handles together in a hugging arc to isolate the pectorals.' },
  { name: 'Pec deck', muscleGroups: ['Chest'], equipment: 'Machine', description: 'Sit in the machine and press the pads together in front of your chest to isolate the pectorals.' },
  { name: 'Push-up', muscleGroups: ['Chest', 'Shoulders', 'Triceps'], equipment: 'Bodyweight', description: 'Lower your body to the floor and press back up, keeping your core rigid and elbows at roughly 45 degrees.' },
  { name: 'Dumbbell pullover', muscleGroups: ['Chest', 'Back'], equipment: 'Dumbbell', description: 'Lying on a bench, lower a dumbbell back over your head in an arc to stretch the chest and lats.' },

  // Back
  { name: 'Lat pulldown', muscleGroups: ['Back', 'Biceps'], equipment: 'Cable machine', description: 'Pull a wide bar down to your upper chest from an overhead cable to build the latissimus dorsi.' },
  { name: 'Seated cable row', muscleGroups: ['Back', 'Biceps'], equipment: 'Cable machine', description: 'Pull a cable handle toward your torso while sitting, driving your elbows back to work the mid-back.' },
  { name: 'Bent-over barbell row', muscleGroups: ['Back', 'Biceps', 'Rear delts'], equipment: 'Barbell', description: 'Hinge at the hips with a flat back and row the barbell toward your lower abdomen to build back thickness.' },
  { name: 'Dumbbell row', muscleGroups: ['Back', 'Biceps'], equipment: 'Dumbbell', description: 'Brace one hand on a bench and row a dumbbell toward your hip with your other arm.' },
  { name: 'T-bar row', muscleGroups: ['Back', 'Biceps'], equipment: 'Barbell', description: 'Straddle a landmine barbell and row the loaded end toward your chest to develop back thickness.' },
  { name: 'Face pull', muscleGroups: ['Rear delts', 'Rotator cuff'], equipment: 'Cable machine', description: 'Pull a rope attachment toward your face at head height to strengthen the rear deltoids and rotator cuff.' },
  { name: 'Straight-arm pulldown', muscleGroups: ['Back'], equipment: 'Cable machine', description: 'With straight arms, pull a cable bar from overhead down to your thighs to isolate the lats.' },
  { name: 'Deadlift', muscleGroups: ['Back', 'Legs', 'Glutes'], equipment: 'Barbell', description: 'Lift a loaded barbell from the floor to hip height by driving through your legs and extending your hips.' },
  { name: 'Romanian deadlift', muscleGroups: ['Hamstrings', 'Glutes', 'Back'], equipment: 'Barbell', description: 'Hinge at the hips while keeping legs nearly straight, lowering the barbell along your shins to feel the hamstring stretch.' },
  { name: 'Pull-up', muscleGroups: ['Back', 'Biceps'], equipment: 'Bodyweight', description: 'Hang from a bar with an overhand grip and pull your chin above the bar by driving your elbows toward your hips.' },
  { name: 'Chin-up', muscleGroups: ['Back', 'Biceps'], equipment: 'Bodyweight', description: 'An underhand-grip pull-up that shifts emphasis toward the biceps and lower lats.' },
  { name: 'Assisted pull-up', muscleGroups: ['Back', 'Biceps'], equipment: 'Machine', description: 'A counterweighted machine version of the pull-up to build the strength needed for unassisted reps.' },

  // Shoulders
  { name: 'Overhead press', muscleGroups: ['Shoulders', 'Triceps'], equipment: 'Barbell', description: 'Press a barbell from shoulder height to full arm extension overhead while standing or seated.' },
  { name: 'Dumbbell shoulder press', muscleGroups: ['Shoulders', 'Triceps'], equipment: 'Dumbbell', description: 'Press dumbbells from shoulder height to overhead, allowing a natural arc to reduce joint stress.' },
  { name: 'Lateral raise', muscleGroups: ['Shoulders'], equipment: 'Dumbbell', description: 'Raise dumbbells out to the sides until arms are parallel to the floor to target the medial deltoid.' },
  { name: 'Front raise', muscleGroups: ['Shoulders'], equipment: 'Dumbbell', description: 'Lift a dumbbell or plate from your thigh to shoulder height in front of you to work the anterior deltoid.' },
  { name: 'Rear delt fly', muscleGroups: ['Rear delts'], equipment: 'Dumbbell', description: 'Bend at the hips and raise dumbbells out to the sides to isolate the posterior deltoid and upper back.' },
  { name: 'Arnold press', muscleGroups: ['Shoulders', 'Triceps'], equipment: 'Dumbbell', description: 'Start with dumbbells at chin level with palms facing you, rotate them outward as you press overhead.' },
  { name: 'Upright row', muscleGroups: ['Shoulders', 'Traps'], equipment: 'Barbell', description: 'Pull a barbell up your torso with elbows leading until it reaches chin height to work the delts and traps.' },
  { name: 'Cable lateral raise', muscleGroups: ['Shoulders'], equipment: 'Cable machine', description: 'A unilateral cable version of the lateral raise that provides constant tension throughout the movement.' },

  // Biceps
  { name: 'Barbell curl', muscleGroups: ['Biceps'], equipment: 'Barbell', description: 'Curl a barbell from full arm extension to shoulder height, keeping your elbows fixed at your sides.' },
  { name: 'Dumbbell curl', muscleGroups: ['Biceps'], equipment: 'Dumbbell', description: 'Alternately or simultaneously curl dumbbells from hanging position to shoulder height.' },
  { name: 'Hammer curl', muscleGroups: ['Biceps', 'Forearms'], equipment: 'Dumbbell', description: 'Curl dumbbells with a neutral (hammer) grip to develop the brachialis and forearm thickness.' },
  { name: 'Incline dumbbell curl', muscleGroups: ['Biceps'], equipment: 'Dumbbell', description: 'Seated on an incline bench, curl dumbbells from behind the body to maximise the biceps stretch.' },
  { name: 'Cable curl', muscleGroups: ['Biceps'], equipment: 'Cable machine', description: 'Curl a cable bar or rope from waist height with constant tension provided by the cable.' },
  { name: 'Preacher curl', muscleGroups: ['Biceps'], equipment: 'Barbell', description: 'Rest your upper arms on a preacher bench pad and curl the bar to isolate the biceps at the bottom of the movement.' },
  { name: 'Concentration curl', muscleGroups: ['Biceps'], equipment: 'Dumbbell', description: 'Seated, brace your elbow against your inner thigh and curl a dumbbell to peak-contract the bicep.' },
  { name: 'EZ bar curl', muscleGroups: ['Biceps'], equipment: 'Barbell', description: 'Use the angled EZ bar to curl with a semi-supinated grip that reduces wrist strain.' },

  // Triceps
  { name: 'Tricep pushdown', muscleGroups: ['Triceps'], equipment: 'Cable machine', description: 'Push a cable bar or rope downward to full arm extension to isolate the triceps.' },
  { name: 'Overhead tricep extension', muscleGroups: ['Triceps'], equipment: 'Dumbbell', description: 'Hold a dumbbell overhead and lower it behind your head, then extend to work the long head of the tricep.' },
  { name: 'Skullcrusher', muscleGroups: ['Triceps'], equipment: 'Barbell', description: 'Lying on a bench, lower an EZ bar toward your forehead by bending only at the elbows, then extend.' },
  { name: 'Close-grip bench press', muscleGroups: ['Triceps', 'Chest'], equipment: 'Barbell', description: 'A bench press with a narrow grip to shift emphasis from the pectorals to the triceps.' },
  { name: 'Tricep dip', muscleGroups: ['Triceps', 'Chest'], equipment: 'Bodyweight', description: 'Lower your body between parallel bars and press back up, keeping your torso upright to focus on the triceps.' },
  { name: 'Cable overhead extension', muscleGroups: ['Triceps'], equipment: 'Cable machine', description: 'Face away from a cable machine and extend a rope overhead to work the tricep long head.' },
  { name: 'Diamond push-up', muscleGroups: ['Triceps', 'Chest'], equipment: 'Bodyweight', description: 'A push-up with hands forming a diamond shape under your chest to maximise tricep activation.' },
  { name: 'Kickback', muscleGroups: ['Triceps'], equipment: 'Dumbbell', description: 'Hinge forward and extend the dumbbell behind you until your arm is straight to isolate the triceps.' },

  // Legs — quads
  { name: 'Squat', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], equipment: 'Barbell', description: 'With a barbell on your upper back, descend until your thighs are parallel to the floor, then drive back up.' },
  { name: 'Leg press', muscleGroups: ['Quads', 'Glutes'], equipment: 'Machine', description: 'Push a weighted platform away from you on a machine to build quad and glute strength with reduced spinal load.' },
  { name: 'Hack squat', muscleGroups: ['Quads'], equipment: 'Machine', description: 'A machine squat variation that positions your back at an angle to emphasise the quadriceps.' },
  { name: 'Leg extension', muscleGroups: ['Quads'], equipment: 'Machine', description: 'Extend your legs against a padded lever to isolate the quadriceps.' },
  { name: 'Bulgarian split squat', muscleGroups: ['Quads', 'Glutes'], equipment: 'Dumbbell', description: 'A single-leg squat with your rear foot elevated on a bench to develop unilateral quad and glute strength.' },
  { name: 'Front squat', muscleGroups: ['Quads', 'Core'], equipment: 'Barbell', description: 'Hold the barbell in a front-rack position and squat, keeping your torso more upright for greater quad emphasis.' },
  { name: 'Goblet squat', muscleGroups: ['Quads', 'Glutes'], equipment: 'Dumbbell', description: 'Hold a dumbbell at chest height and squat with a wide stance for a beginner-friendly quad and glute exercise.' },
  { name: 'Lunge', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], equipment: 'Dumbbell', description: 'Step forward into a lunge position and lower your rear knee toward the floor, then return to standing.' },
  { name: 'Step-up', muscleGroups: ['Quads', 'Glutes'], equipment: 'Dumbbell', description: 'Step up onto a box or bench with one leg and drive to full extension before stepping back down.' },

  // Legs — hamstrings/glutes
  { name: 'Leg curl', muscleGroups: ['Hamstrings'], equipment: 'Machine', description: 'Curl a padded lever toward your glutes to isolate the hamstrings in a lying or seated machine.' },
  { name: 'Glute bridge', muscleGroups: ['Glutes', 'Hamstrings'], equipment: 'Bodyweight', description: 'Lie on your back with knees bent and drive your hips toward the ceiling by squeezing your glutes.' },
  { name: 'Hip thrust', muscleGroups: ['Glutes', 'Hamstrings'], equipment: 'Barbell', description: 'With your upper back on a bench and a barbell across your hips, thrust your hips upward to full extension.' },
  { name: 'Good morning', muscleGroups: ['Hamstrings', 'Back'], equipment: 'Barbell', description: 'With a barbell on your upper back, hinge at the hips to horizontal while keeping your back straight.' },
  { name: 'Cable kickback', muscleGroups: ['Glutes'], equipment: 'Cable machine', description: 'Attach an ankle cuff to a cable machine and kick your leg back to isolate the glute.' },
  { name: 'Sumo deadlift', muscleGroups: ['Glutes', 'Hamstrings', 'Back'], equipment: 'Barbell', description: 'A wide-stance deadlift variation that shifts emphasis to the adductors, glutes, and inner hamstrings.' },

  // Legs — calves
  { name: 'Standing calf raise', muscleGroups: ['Calves'], equipment: 'Machine', description: 'Rise onto the balls of your feet against a resistance to build the gastrocnemius muscle.' },
  { name: 'Seated calf raise', muscleGroups: ['Calves'], equipment: 'Machine', description: 'Raise your heels while seated with a pad across your thighs to target the soleus muscle.' },
  { name: 'Leg press calf raise', muscleGroups: ['Calves'], equipment: 'Machine', description: 'Place only the balls of your feet on the bottom of the leg press platform and perform calf raises.' },

  // Core
  { name: 'Plank', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Hold a rigid push-up position on your forearms, keeping your body in a straight line from head to heels.' },
  { name: 'Crunch', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Lie on your back with knees bent and curl your shoulders off the floor to contract the rectus abdominis.' },
  { name: 'Sit-up', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'From lying flat, sit all the way up by flexing the hip flexors and abdominals together.' },
  { name: 'Leg raise', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Lying flat, raise both straight legs to 90 degrees and lower them slowly to work the lower abs.' },
  { name: 'Cable crunch', muscleGroups: ['Core'], equipment: 'Cable machine', description: 'Kneel in front of a cable machine and crunch your elbows toward your knees against the resistance.' },
  { name: 'Russian twist', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Seated with feet off the floor, rotate your torso side to side to work the obliques.' },
  { name: 'Ab wheel rollout', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Roll an ab wheel out from kneeling until your body is nearly flat, then pull back using core strength.' },
  { name: 'Dead bug', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'On your back, extend opposite arm and leg toward the floor while keeping your lower back pressed down.' },
  { name: 'Hollow hold', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Lie on your back and raise both arms and legs slightly off the floor while pressing your lower back down.' },
  { name: 'Side plank', muscleGroups: ['Core', 'Obliques'], equipment: 'Bodyweight', description: 'Support your body on one forearm and the side of one foot, keeping your hips elevated for the obliques.' },

  // Cardio / conditioning
  { name: 'Treadmill', muscleGroups: ['Cardio'], equipment: 'Machine', description: 'Walk, jog, or run on a motorised treadmill to develop cardiovascular fitness and burn calories.' },
  { name: 'Stationary bike', muscleGroups: ['Cardio', 'Quads'], equipment: 'Machine', description: 'Pedal a stationary bike for low-impact cardiovascular conditioning with minimal joint stress.' },
  { name: 'Rowing machine', muscleGroups: ['Cardio', 'Back', 'Arms'], equipment: 'Machine', description: 'Drive with your legs and pull with your arms on a rowing ergometer for full-body cardiovascular training.' },
  { name: 'Elliptical', muscleGroups: ['Cardio'], equipment: 'Machine', description: 'Stride on an elliptical trainer for low-impact cardio that works both the upper and lower body.' },
  { name: 'Stair climber', muscleGroups: ['Cardio', 'Quads', 'Glutes'], equipment: 'Machine', description: 'Step continuously on a revolving staircase machine to build cardiovascular endurance and lower-body strength.' },
  { name: 'Assault bike', muscleGroups: ['Cardio'], equipment: 'Machine', description: 'Pedal and pump the moving handlebars of an air-resistance bike for an intense full-body cardiovascular effort.' },
  { name: 'Battle ropes', muscleGroups: ['Cardio', 'Shoulders', 'Core'], equipment: 'Other', description: 'Slam and wave heavy ropes for an intense conditioning exercise targeting the upper body and core.' },
  { name: 'Sled push', muscleGroups: ['Quads', 'Glutes', 'Cardio'], equipment: 'Other', description: 'Drive a weighted sled across the floor by pushing from behind, developing lower-body power and conditioning.' },
  { name: 'Box jump', muscleGroups: ['Quads', 'Glutes', 'Cardio'], equipment: 'Bodyweight', description: 'Explosively jump onto a box or platform and step back down to develop lower-body power.' },
  { name: 'Kettlebell swing', muscleGroups: ['Glutes', 'Hamstrings', 'Core'], equipment: 'Kettlebell', description: 'Hinge at the hips to swing a kettlebell between your legs and project it to shoulder height using hip drive.' },
  { name: 'Burpee', muscleGroups: ['Cardio', 'Chest', 'Core'], equipment: 'Bodyweight', description: 'Drop to a push-up, perform the push-up, jump your feet in, and leap up with arms overhead for full-body conditioning.' },
  { name: 'Jump rope', muscleGroups: ['Cardio', 'Calves'], equipment: 'Other', description: 'Skip rope at varying tempos to improve cardiovascular fitness and coordination.' },

  // Traps
  { name: 'Barbell shrug', muscleGroups: ['Traps'], equipment: 'Barbell', description: 'Hold a barbell at arm length and elevate your shoulders straight up toward your ears to target the upper trapezius.' },
  { name: 'Dumbbell shrug', muscleGroups: ['Traps'], equipment: 'Dumbbell', description: 'Hold dumbbells at your sides and shrug your shoulders upward, pausing briefly at the top to contract the traps.' },

  // Forearms
  { name: 'Wrist curl', muscleGroups: ['Forearms'], equipment: 'Barbell', description: 'Rest your forearms on a bench with palms up and curl the bar by flexing only at the wrists to work the forearm flexors.' },
  { name: 'Reverse curl', muscleGroups: ['Forearms', 'Biceps'], equipment: 'Barbell', description: 'Curl a barbell with an overhand grip to target the brachioradialis and forearm extensors alongside the biceps.' },
  { name: 'Farmer\'s carry', muscleGroups: ['Forearms', 'Traps', 'Core'], equipment: 'Dumbbell', description: 'Walk a set distance while holding heavy dumbbells at your sides to build grip strength, traps, and core stability.' },

  // Chest — additional
  { name: 'Chest dip', muscleGroups: ['Chest', 'Triceps'], equipment: 'Bodyweight', description: 'Lean forward on parallel bars and lower your body until your chest is level with the bars, then press back up to emphasise the lower pectorals.' },
  { name: 'Incline fly', muscleGroups: ['Chest'], equipment: 'Dumbbell', description: 'On an incline bench, arc dumbbells out and back together over the upper chest to isolate the clavicular pectoral fibres.' },

  // Back — additional
  { name: 'Rack pull', muscleGroups: ['Back', 'Glutes'], equipment: 'Barbell', description: 'A partial deadlift starting from knee height in a rack, allowing heavier loads to overload the upper back and hip extensors.' },
  { name: 'Pendlay row', muscleGroups: ['Back', 'Biceps'], equipment: 'Barbell', description: 'Row a barbell from the floor on each rep with a horizontal torso, emphasising explosive lat and mid-back strength.' },
  { name: 'Chest-supported row', muscleGroups: ['Back', 'Biceps'], equipment: 'Dumbbell', description: 'Lie chest-down on an incline bench and row dumbbells toward your hips, removing lower-back stress from the movement.' },
  { name: 'Single-arm cable row', muscleGroups: ['Back', 'Biceps'], equipment: 'Cable machine', description: 'Pull a cable handle unilaterally toward your hip to correct strength imbalances and maximise lat stretch.' },

  // Legs — additional quads
  { name: 'Walking lunge', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], equipment: 'Dumbbell', description: 'Step forward into a lunge, then bring the rear foot forward and immediately step into the next rep to keep moving.' },
  { name: 'Reverse lunge', muscleGroups: ['Quads', 'Glutes'], equipment: 'Dumbbell', description: 'Step backward into a lunge to reduce knee stress compared to a forward lunge while still loading the quads and glutes.' },
  { name: 'Smith machine squat', muscleGroups: ['Quads', 'Glutes'], equipment: 'Machine', description: 'Squat on a guided barbell in a Smith machine, useful for beginners or when training to failure without a spotter.' },

  // Legs — additional hamstrings/glutes
  { name: 'Nordic curl', muscleGroups: ['Hamstrings'], equipment: 'Bodyweight', description: 'Kneel with your feet anchored, lower your body toward the floor by resisting with your hamstrings, then use your hands to push back up.' },
  { name: 'Stiff-leg deadlift', muscleGroups: ['Hamstrings', 'Back'], equipment: 'Barbell', description: 'Lower a barbell toward the floor with minimal knee bend to maximise the stretch and load on the hamstrings.' },
  { name: 'Donkey kick', muscleGroups: ['Glutes'], equipment: 'Bodyweight', description: 'On all fours, drive one heel toward the ceiling by extending the hip to isolate the gluteus maximus.' },
  { name: 'Hip abduction', muscleGroups: ['Glutes'], equipment: 'Machine', description: 'Push padded arms outward from a seated position to strengthen the hip abductors and outer glutes.' },
  { name: 'Hip adduction', muscleGroups: ['Quads'], equipment: 'Machine', description: 'Press padded arms inward from a seated position to strengthen the hip adductors on the inner thigh.' },

  // Core — additional
  { name: 'Hanging leg raise', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Hang from a pull-up bar and raise both legs to 90 degrees or higher to target the lower abs and hip flexors.' },
  { name: 'Bicycle crunch', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Alternate touching each elbow to the opposite knee in a pedalling motion to work the obliques and rectus abdominis.' },
  { name: 'Mountain climber', muscleGroups: ['Core', 'Cardio'], equipment: 'Bodyweight', description: 'In a push-up position, drive alternating knees toward your chest as fast as possible to build core stability and conditioning.' },
  { name: 'Pallof press', muscleGroups: ['Core'], equipment: 'Cable machine', description: 'Press a cable handle straight out from your chest while resisting rotation to build anti-rotational core strength.' },
  { name: 'Dragon flag', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Grip a bench above your head and lower your body as one rigid unit toward the floor, then raise it back up for elite core strength.' },
  { name: 'Toe touch', muscleGroups: ['Core'], equipment: 'Bodyweight', description: 'Lie flat, raise straight legs to vertical, and reach your hands toward your toes to crunch the upper and lower abs simultaneously.' },
]

async function main() {
  console.log('Seeding exercise library...')
  let count = 0
  for (const ex of exercises) {
    await prisma.exerciseLibrary.upsert({
      where: { name: ex.name },
      update: {
        muscleGroups: ex.muscleGroups,
        equipment: ex.equipment,
        description: ex.description,
      },
      create: {
        name: ex.name,
        muscleGroups: ex.muscleGroups,
        equipment: ex.equipment,
        description: ex.description,
        isCustom: false,
      },
    })
    count++
  }
  console.log(`Seeded ${count} exercises.`)
}

main()
  .catch(err => { console.error('Seed failed (non-fatal):', err.message) })
  .finally(() => prisma.$disconnect())
