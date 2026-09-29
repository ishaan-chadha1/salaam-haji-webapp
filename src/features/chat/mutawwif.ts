import type { Session } from '../ritual/ritualStore'

/**
 * Reply source for the Digital Mutawwif. Same keyword answers as
 * ChatBloc._callChatAPI in the Flutter app, which has no real model behind it
 * yet; swap this function for an API call when one exists. The current ritual
 * session is passed in so a real model can use it as context.
 */
export async function replyTo(message: string, session: Session | null): Promise<string> {
  await new Promise((r) => setTimeout(r, 700))
  const m = message.toLowerCase()
  if (m.includes('dua') || m.includes('prayer')) {
    return 'Here is a beautiful dua for you:\n\n"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ"\n\n"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire."'
  }
  if (m.includes('qibla') || m.includes('direction')) {
    return 'The Qibla direction is towards the Kaaba in Mecca. You can use the Qibla compass in the app to find the exact direction.'
  }
  if (m.includes('ritual') || m.includes('umrah') || m.includes('hajj')) {
    const current = session ? `\n\nYou are on lap ${session.laps} of ${session.totalLaps} of your ${session.stage === 'tawaf' ? 'Tawaf' : "Sa'i"}.` : ''
    return `I can help you with your ritual journey. Would you like to:\n• Start a new ritual session\n• Get guidance for your current stage\n• Learn about the steps of Umrah or Hajj${current}`
  }
  if (m.includes('gate') || m.includes('entrance')) {
    return 'To find the nearest gate, please enable location services. I can help guide you once I know your location.'
  }
  return 'Assalamu alaikum! I am your Digital Mutawwif, here to guide you on your spiritual journey. How can I assist you today? You can ask me about:\n• Ritual guidance\n• Duas and prayers\n• Qibla direction\n• Prayer times\n• Any questions about your pilgrimage'
}
