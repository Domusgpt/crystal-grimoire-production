/**
 * 🔮 I-Ching Hexagram System for Crystal Grimoire
 * 64 hexagrams for cosmic divination and consultation seeding
 */

const hexagrams = [
  { number: 1, name: "The Creative", chineseName: "乾 (Qián)", trigrams: "☰☰", interpretation: "Pure yang energy. Creative force, heaven, leadership. The beginning of all things, strength and vitality." },
  { number: 2, name: "The Receptive", chineseName: "坤 (Kūn)", trigrams: "☷☷", interpretation: "Pure yin energy. Receptivity, earth, nurturing. Yielding, supportive, maternal wisdom." },
  { number: 3, name: "Difficulty at the Beginning", chineseName: "屯 (Zhūn)", trigrams: "☵☳", interpretation: "Initial struggle before breakthrough. Chaos before order. Patience and perseverance required." },
  { number: 4, name: "Youthful Folly", chineseName: "蒙 (Méng)", trigrams: "☶☵", interpretation: "Inexperience, learning, seeking knowledge. The student seeking the teacher." },
  { number: 5, name: "Waiting", chineseName: "需 (Xū)", trigrams: "☵☰", interpretation: "Patient anticipation. Nourishment comes in its own time. Trust the process." },
  { number: 6, name: "Conflict", chineseName: "訟 (Sòng)", trigrams: "☰☵", interpretation: "Inner tension, disputes. Resolution through compromise and understanding." },
  { number: 7, name: "The Army", chineseName: "師 (Shī)", trigrams: "☷☵", interpretation: "Discipline, organization, collective effort. Leadership in service of the greater good." },
  { number: 8, name: "Holding Together", chineseName: "比 (Bǐ)", trigrams: "☵☷", interpretation: "Union, alliance, mutual support. Strength through connection." },
  { number: 9, name: "Small Accumulating", chineseName: "小畜 (Xiǎo Chù)", trigrams: "☰☴", interpretation: "Gradual progress, small gains. Gentle restraint leads to eventual success." },
  { number: 10, name: "Treading", chineseName: "履 (Lǚ)", trigrams: "☱☰", interpretation: "Careful conduct, proper behavior. Walking with awareness and respect." },
  
  { number: 11, name: "Peace", chineseName: "泰 (Tài)", trigrams: "☷☰", interpretation: "Harmony, balance, prosperity. Heaven and earth in perfect alignment." },
  { number: 12, name: "Standstill", chineseName: "否 (Pǐ)", trigrams: "☰☷", interpretation: "Stagnation, withdrawal. A time for inner work and patience." },
  { number: 13, name: "Fellowship", chineseName: "同人 (Tóng Rén)", trigrams: "☰☲", interpretation: "Community, shared purpose. Unity in diversity." },
  { number: 14, name: "Great Possessing", chineseName: "大有 (Dà Yǒu)", trigrams: "☲☰", interpretation: "Abundance, great wealth. Blessings to be shared with generosity." },
  { number: 15, name: "Modesty", chineseName: "謙 (Qiān)", trigrams: "☷☶", interpretation: "Humility, unpretentiousness. True greatness without arrogance." },
  { number: 16, name: "Enthusiasm", chineseName: "豫 (Yù)", trigrams: "☳☷", interpretation: "Joy, inspiration, motivation. Harmonious movement forward." },
  { number: 17, name: "Following", chineseName: "隨 (Suí)", trigrams: "☱☳", interpretation: "Adaptability, going with the flow. Following what is right." },
  { number: 18, name: "Work on the Decayed", chineseName: "蠱 (Gǔ)", trigrams: "☶☴", interpretation: "Repair, correction, healing. Addressing corruption or decay." },
  { number: 19, name: "Approach", chineseName: "臨 (Lín)", trigrams: "☷☱", interpretation: "Advancing with care. Spring approaching, growth imminent." },
  { number: 20, name: "Contemplation", chineseName: "觀 (Guān)", trigrams: "☴☷", interpretation: "Observation, reflection. Seeing the bigger picture." },
  
  { number: 21, name: "Biting Through", chineseName: "噬嗑 (Shì Hé)", trigrams: "☲☳", interpretation: "Breaking through obstacles. Justice and clarity." },
  { number: 22, name: "Grace", chineseName: "賁 (Bì)", trigrams: "☶☲", interpretation: "Beauty, elegance, refinement. Form and substance in harmony." },
  { number: 23, name: "Splitting Apart", chineseName: "剝 (Bō)", trigrams: "☶☷", interpretation: "Disintegration, letting go. The old must fall away." },
  { number: 24, name: "Return", chineseName: "復 (Fù)", trigrams: "☷☳", interpretation: "Turning point, renewal. Light returns after darkness." },
  { number: 25, name: "Innocence", chineseName: "無妄 (Wú Wàng)", trigrams: "☰☳", interpretation: "Spontaneity, naturalness. Action without ulterior motive." },
  { number: 26, name: "Great Accumulating", chineseName: "大畜 (Dà Chù)", trigrams: "☶☰", interpretation: "Gathering strength, holding firm. Great power restrained." },
  { number: 27, name: "Nourishment", chineseName: "頤 (Yí)", trigrams: "☶☳", interpretation: "Sustenance, self-care. Nourishing body and spirit." },
  { number: 28, name: "Great Exceeding", chineseName: "大過 (Dà Guò)", trigrams: "☱☴", interpretation: "Extraordinary times, extreme pressure. Bold action required." },
  { number: 29, name: "The Abysmal Water", chineseName: "坎 (Kǎn)", trigrams: "☵☵", interpretation: "Danger, depth, flow. Navigating through challenges." },
  { number: 30, name: "The Clinging Fire", chineseName: "離 (Lí)", trigrams: "☲☲", interpretation: "Clarity, illumination, passion. Light that reveals truth." },
  
  { number: 31, name: "Influence", chineseName: "咸 (Xián)", trigrams: "☱☶", interpretation: "Attraction, courtship, mutual responsiveness. Heart-to-heart connection." },
  { number: 32, name: "Duration", chineseName: "恆 (Héng)", trigrams: "☳☴", interpretation: "Endurance, consistency, lasting commitment. Standing the test of time." },
  { number: 33, name: "Retreat", chineseName: "遯 (Dùn)", trigrams: "☰☶", interpretation: "Strategic withdrawal. Knowing when to step back." },
  { number: 34, name: "Great Power", chineseName: "大壯 (Dà Zhuàng)", trigrams: "☳☰", interpretation: "Strength, vigor, momentum. Power used wisely." },
  { number: 35, name: "Progress", chineseName: "晉 (Jìn)", trigrams: "☲☷", interpretation: "Advancement, clarity emerging. Rising like the sun." },
  { number: 36, name: "Darkening of the Light", chineseName: "明夷 (Míng Yí)", trigrams: "☷☲", interpretation: "Hidden brightness. Light concealed but not extinguished." },
  { number: 37, name: "The Family", chineseName: "家人 (Jiā Rén)", trigrams: "☴☲", interpretation: "Household, belonging, proper relationships. Foundation of society." },
  { number: 38, name: "Opposition", chineseName: "睽 (Kuí)", trigrams: "☲☱", interpretation: "Divergence, polarity. Unity through accepting differences." },
  { number: 39, name: "Obstruction", chineseName: "蹇 (Jiǎn)", trigrams: "☵☶", interpretation: "Difficulty, impediment. Inner reflection before outer action." },
  { number: 40, name: "Deliverance", chineseName: "解 (Xiè)", trigrams: "☳☵", interpretation: "Liberation, release, resolution. Thunder and rain clear the air." },
  
  { number: 41, name: "Decrease", chineseName: "損 (Sǔn)", trigrams: "☶☱", interpretation: "Simplification, letting go. Less is more." },
  { number: 42, name: "Increase", chineseName: "益 (Yì)", trigrams: "☴☳", interpretation: "Augmentation, benefit, growth. Blessings multiply." },
  { number: 43, name: "Breakthrough", chineseName: "夬 (Guài)", trigrams: "☱☰", interpretation: "Decisive action, resolution. Cutting through with clarity." },
  { number: 44, name: "Coming to Meet", chineseName: "姤 (Gòu)", trigrams: "☰☴", interpretation: "Encounter, temptation. Meeting with awareness." },
  { number: 45, name: "Gathering Together", chineseName: "萃 (Cuì)", trigrams: "☱☷", interpretation: "Assembly, congregation. Collective power." },
  { number: 46, name: "Pushing Upward", chineseName: "升 (Shēng)", trigrams: "☷☴", interpretation: "Ascending, rising. Growth through effort." },
  { number: 47, name: "Oppression", chineseName: "困 (Kùn)", trigrams: "☱☵", interpretation: "Exhaustion, adversity. Finding inner strength." },
  { number: 48, name: "The Well", chineseName: "井 (Jǐng)", trigrams: "☵☴", interpretation: "Source, nourishment, community resource. Drawing from the depths." },
  { number: 49, name: "Revolution", chineseName: "革 (Gé)", trigrams: "☱☲", interpretation: "Transformation, change. Molting, renewal." },
  { number: 50, name: "The Cauldron", chineseName: "鼎 (Dǐng)", trigrams: "☲☴", interpretation: "Nourishment, refinement, transformation. Alchemical vessel." },
  
  { number: 51, name: "The Arousing Thunder", chineseName: "震 (Zhèn)", trigrams: "☳☳", interpretation: "Shock, awakening, movement. Sudden clarity." },
  { number: 52, name: "Keeping Still Mountain", chineseName: "艮 (Gèn)", trigrams: "☶☶", interpretation: "Stillness, meditation, grounding. Mountain's stability." },
  { number: 53, name: "Development", chineseName: "漸 (Jiàn)", trigrams: "☴☶", interpretation: "Gradual progress, organic growth. Step by step advancement." },
  { number: 54, name: "The Marrying Maiden", chineseName: "歸妹 (Guī Mèi)", trigrams: "☳☱", interpretation: "Transition, new roles. Accepting change." },
  { number: 55, name: "Abundance", chineseName: "豐 (Fēng)", trigrams: "☳☲", interpretation: "Fullness, peak, prosperity. Zenith of achievement." },
  { number: 56, name: "The Wanderer", chineseName: "旅 (Lǚ)", trigrams: "☲☶", interpretation: "Journey, pilgrimage, transience. Finding home within." },
  { number: 57, name: "The Gentle Wind", chineseName: "巽 (Xùn)", trigrams: "☴☴", interpretation: "Penetration, influence, flexibility. Wind's persistent gentleness." },
  { number: 58, name: "The Joyous Lake", chineseName: "兌 (Duì)", trigrams: "☱☱", interpretation: "Joy, pleasure, communication. Lake's reflective serenity." },
  { number: 59, name: "Dispersion", chineseName: "渙 (Huàn)", trigrams: "☴☵", interpretation: "Dissolution, distribution. Wind over water, scattering." },
  { number: 60, name: "Limitation", chineseName: "節 (Jié)", trigrams: "☵☱", interpretation: "Boundaries, restraint, moderation. Proper measure." },
  
  { number: 61, name: "Inner Truth", chineseName: "中孚 (Zhōng Fú)", trigrams: "☴☱", interpretation: "Sincerity, authenticity, core truth. Wind over lake." },
  { number: 62, name: "Small Exceeding", chineseName: "小過 (Xiǎo Guò)", trigrams: "☳☶", interpretation: "Minor transgressions, attention to detail. Thunder over mountain." },
  { number: 63, name: "After Completion", chineseName: "既濟 (Jì Jì)", trigrams: "☵☲", interpretation: "Culmination, order achieved. Vigilance in success." },
  { number: 64, name: "Before Completion", chineseName: "未濟 (Wèi Jì)", trigrams: "☲☵", interpretation: "Transition, potential, the journey continues. Fire over water." }
];

/**
 * Get random hexagram (simulates I-Ching divination)
 * Uses cosmic randomness as "channeled" oracle
 */
function castHexagram() {
  const index = Math.floor(Math.random() * 64);
  return hexagrams[index];
}

/**
 * Get hexagram by number (1-64)
 */
function getHexagram(number) {
  if (number < 1 || number > 64) {
    throw new Error('Hexagram number must be between 1 and 64');
  }
  return hexagrams[number - 1];
}

/**
 * Get hexagram interpretation for consultation context
 */
function interpretHexagram(hexagram, userQuestion) {
  return `The cosmic energies have revealed Hexagram ${hexagram.number}: ${hexagram.name} (${hexagram.chineseName}). ${hexagram.interpretation} This energy surrounds your question: "${userQuestion}"`;
}

module.exports = {
  hexagrams,
  castHexagram,
  getHexagram,
  interpretHexagram
};
