/* The music box's manual, shown in its last drawer. */
window.MBMANUAL = `<div class="mbx-manual text">
<h3>The music box: a manual</h3>
<p>The walnut box on the Entry's right wall opens into a workshop of six drawers. The first three make and shape sound; the fourth brings sound in from elsewhere; the fifth listens to the room with it; the sixth is this. <b>Play</b> and <b>Stop</b>, at the top, belong to the composer; everything else has its own controls. Escape closes the workshop. All of it is computed in your browser as it plays: nothing is recorded or sent anywhere.</p>

<h4>1. Compose</h4>
<p><b>Kind.</b> Each kind of music is a small set of rules run once a beat:</p>
<ul>
<li><b>Ambient</b>: slow chords, a drone, and a few notes wandering by step.</li>
<li><b>Music box waltz</b>: a melody over a bass and two chord tones in three-four.</li>
<li><b>Minimalist phasing</b>: two players repeat the same twelve notes, and the second gradually pulls ahead, in the manner of Steve Reich's <i>Piano Phase</i>.</li>
<li><b>Rāga</b>: a tanpura drone (Pa, Sa, Sa, low Sa) and an ālāp that begins low and climbs as it goes on. Above 70 bpm, a tabla keeps time.</li>
<li><b>Gamelan</b>: a core melody (balungan) on the saron, two interlocking parts (kotekan), the kenong, and the great gong at the end of every sixteen beats.</li>
<li><b>Koto and shakuhachi</b>: sparse plucked chords and long breathy notes, with silence (<i>ma</i>) between.</li>
<li><b>Taqsīm and maqsūm</b>: an oud-like improvisation over the maqsūm rhythm, dum–tek–tek–dum–tek.</li>
<li><b>Chorale</b>: four voices, each moving to the nearest note of the next chord.</li>
<li><b>Change ringing</b>: six bells ring the plain hunt. Every pair swaps, (12)(34)(56), then the inner pairs swap, (23)(45), and so on until rounds come back after twelve rows. These are permutations you can hear.</li>
<li><b>Overtone drone</b>: one pitch, with a narrow resonance walking up and down its harmonics, as in Tuvan throat singing.</li>
<li><b>Lounge</b>: ii–V–I seventh chords, a walking bass, and brushes.</li>
<li><b>Silence and single notes</b>: almost nothing.</li>
</ul>
<p><b>Tempo, density, swing.</b> Tempo is in beats per minute. Density is how likely the optional notes are. Swing delays every other beat.</p>
<p><b>Root, scale, tuning.</b> The scale's degrees are counted in <i>cents</i>, hundredths of an equal-tempered semitone, so 1200 cents is an octave. The ruler under the menus shows where the degrees fall against the twelve equal semitones. Western scales take their notes from the chosen <b>tuning</b>:</p>
<ul>
<li><b>equal temperament</b>, where every semitone is 100 cents;</li>
<li><b>5-limit just intonation</b>, made of ratios of 2, 3, and 5, such as the 386-cent major third 5/4;</li>
<li><b>Pythagorean</b>, built from pure fifths, 3/2;</li>
<li><b>quarter-comma meantone</b>, with pure thirds and narrowed fifths;</li>
<li><b>Werckmeister III and Kirnberger III</b>, the well-temperaments of Bach's time, in which every key is usable but each sounds different.</li>
</ul>
<p>The other scales carry their own tuning:</p>
<ul>
<li>ragas in just intonation;</li>
<li>maqamat with quarter tones, including Hicaz in 53 commas to the octave;</li>
<li>sléndro and pélog gamelan, which differ from one gamelan to the next (these are typical values);</li>
<li>the Japanese, Chinese, and Ethiopian pentatonic scales;</li>
<li>scales in 5, 7, 19, 22, 24, 31, and 53 equal divisions of the octave;</li>
<li>the harmonic and subharmonic series;</li>
<li>Bohlen–Pierce, which divides the "tritave" 3/1 into thirteen equal steps and never meets an octave at all;</li>
<li>Wendy Carlos's alpha, steps of 78 cents that never return to the octave.</li>
</ul>
<p><b>Players.</b> The music has three roles, lead, harmony, and bass, and any instrument can play any role. The instruments are all synthesized:</p>
<ul>
<li><b>comb</b>, the music box's own steel teeth: a few slightly inharmonic partials;</li>
<li><b>bell</b>, by frequency modulation;</li>
<li><b>pluck, koto, and oud</b>, by the Karplus–Strong method: a burst of noise circulating in a tuned delay that loses a little treble each time round;</li>
<li><b>pad and organ</b>;</li>
<li><b>flute and shakuhachi</b>, with breath noise and vibrato;</li>
<li><b>bowed</b>, a sawtooth through formants;</li>
<li><b>metal</b>, gamelan bronze with the paired detuning (ombak) that makes it shimmer;</li>
<li><b>gong, tanpura, marimba, electric piano, bass, drone, and throat</b>.</li>
</ul>
<p><b>Ambience.</b> Rain, a tin roof, wind, surf, a stream, a fire, night insects, birds, cave drips, a distant city, and room tone. All are made from noise and oscillators. Ticking <i>put the ambience in the room too</i> sends it through the reverberation as well.</p>
<p><b>The cylinder</b> at the bottom draws the notes just played as pins on a turning drum, passing the comb. Lead notes are red, harmony brown, and bass blue.</p>

<h4>2. Room</h4>
<p>A room's sound is its <b>impulse response</b> h(t): what reaches your ear after a single instantaneous click. Any sound x played in that room arrives as the <b>convolution</b></p>
<p class="mono">y(t) = (x ∗ h)(t) = ∫ h(τ) x(t − τ) dτ.</p>
<p>The box keeps a library of rooms. Some are made by rule: rectangular rooms by mirror images, tails of decaying noise, a spring, a canyon, and a tunnel. Others you have measured or loaded yourself. Choose one, and set how much of it you hear with <b>Wet</b>.</p>
<p><b>Four senses of convolution.</b></p>
<ul>
<li><b>Causal</b>: the kernel acts only forward in time, as every real room does. The echo follows the sound.</li>
<li><b>Anti-causal</b>: the kernel is reversed, y(t) = ∫ h(τ) x(t + τ) dτ, so the echo comes <i>before</i> the sound and swells into it. Nothing physical does this. The box manages it by holding back the dry sound for the length of the room's response, so that the "future" is available to it.</li>
<li><b>Symmetric</b>: the even part ½(h(t) + h(−t)). Half the echo comes before the sound and half after.</li>
<li><b>Zero-phase</b>: filtering forward and then backward, h ∗ h̃ where h̃(t) = h(−t). Its spectrum is |H(f)|², real and positive. Every frequency is kept exactly in time and only its loudness changes. Signal processors call this <i>filtfilt</i>.</li>
</ul>
<p>The three pictures show the response itself, its <b>energy decay</b>, and its <b>spectrum</b>. The energy decay is found by Schroeder's backward integration, E(t) = ∫<sub>t</sub><sup>∞</sup> h²(τ) dτ, in decibels. Its slope between −5 and −25 dB, extended to −60 dB, gives <b>RT60</b>, the reverberation time.</p>
<p><b>Making one.</b> The <i>rectangular room</i> uses the image-source method of Allen and Berkley (1979). A reflection off a flat wall sounds like a mirrored copy of the source behind the wall. The mirrors of mirrors fill space with a lattice of images. Each image arrives after its distance divided by the speed of sound, weakened by 1/distance and by √(1 − α) at every wall it reflected from, where α is the absorption. The box sums the images up to the chosen order. It then joins on a noise tail matched to the energy at that point, with the decay time given by Sabine's formula RT60 = 0.161 V/(S α). The <i>tail</i> is simpler: noise that decays exponentially and gets darker as it fades, because air and walls take the high frequencies first.</p>
<p><b>Measuring one.</b> Choose a microphone and a speaker. Real speakers work better than a laptop's, and headphones don't work at all. The box plays a <b>probe</b>, records what comes back, and works out h. The browser's echo cancellation, noise suppression, and automatic gain are all switched off for this, because they would destroy the measurement. The probes:</p>
<ul>
<li><b>Exponential sine sweep</b> (Farina, 2000): a tone gliding from low to high, spending equal time on each octave. Convolving the recording with its <i>inverse filter</i> (the sweep reversed, tilted down 6 dB per octave) collapses it to the impulse response. The sweep has one gift no other probe has: the loudspeaker's harmonic distortion separates out and lands <i>before</i> time zero, each harmonic at its own fixed early time. The box shows it there and keeps it out of the response.</li>
<li><b>Linear sweep</b>: equal time on each hertz.</li>
<li><b>Impulse</b>: a click. It is honest and simple, but noisy, because a click carries little energy.</li>
<li><b>Maximum-length sequence</b>: a ±1 sequence from a shift register, of length 2ⁿ − 1, whose circular autocorrelation is almost a perfect spike. It is played twice, so that the second period sees a room already in steady state.</li>
<li><b>Golay complementary pair</b>: two ±1 sequences whose autocorrelations cancel everywhere except at zero, where they add. Together they make a perfect delta.</li>
<li><b>White and pink noise</b>: like listening to a waterfall and working backwards.</li>
<li><b>Short chirp</b>: a Hann-shaped glide, the sonar's probe.</li>
<li><b>Costas frequency hops</b>: thirteen tone bursts whose frequencies follow a Costas array (Welch's construction, g<sup>i</sup> mod p). No two pairs of bursts share the same offset in both time and frequency, so a delay and a Doppler shift can each be told apart unambiguously: the ambiguity function is a single spike. Navies use these for sonar and radar.</li>
<li><b>Anti-harmonic multitone</b>: sixteen steady tones chosen so that no two stand near a small whole-number ratio, which keeps their distortion products and the room's resonances from landing on one another. Their phases follow Schroeder's rule φ<sub>k</sub> = −πk²/n, which keeps the sum's peaks low. This probe measures the room only at those frequencies, so its "impulse response" is a sketch.</li>
</ul>
<p><b>The arithmetic.</b> Apart from the sweep's inverse filter and the Golay pair, the box finds h by regularized spectral division:</p>
<p class="mono">H(f) = Y(f) X*(f) / (|X(f)|² + ε·max|X|²).</p>
<p>Here Y is the recording and X the probe. ε keeps the division from blowing up where the probe has no energy: raise it if the result is noisy, and lower it for detail. <b>Repeats</b> are averaged before the division, and every doubling of the repeats gains about 3 dB over the noise. The trip through the computer's buffers (the latency) is reported and trimmed away. The result can be kept in the library, which is stored in this browser only, downloaded as a WAV file, or used at once.</p>

<h4>3. Lab</h4>
<p>Choose two signals, A and B. Each can be a recording (eight seconds of the music box, or of the microphone), a file, any room, any probe, or a test signal: clicks, a pure tone, or a plucked note. Then do one of these:</p>
<ul>
<li>convolve A by B in any of the four senses;</li>
<li>deconvolve A by B (that is, find the C for which A ≈ B ∗ C), with ε as above;</li>
<li>correlate A with B, r(τ) = ∫ A(t + τ) B(t) dt, which finds where B occurs inside A;</li>
<li>autocorrelate A, which finds A's own periodicities;</li>
<li>reverse A.</li>
</ul>
<p>Results show where time zero falls (the red line), can be played, downloaded, made into the room, or fed back in as A.</p>
<p>Things to try:</p>
<ul>
<li>a plucked note convolved with the cathedral;</li>
<li>the same in the anti-causal sense;</li>
<li>a recording of your voice correlated with itself;</li>
<li>a probe convolved with a room and then deconvolved by the probe, which gives the room back, a little blurred;</li>
<li>a sweep convolved with its own reverse, which gives a spike.</li>
</ul>
<p>Everything runs by the fast Fourier transform, all at once. Each signal is capped at forty seconds, so the browser's memory holds out.</p>

<h4>4. Sources</h4>
<p><b>Files</b> from your computer play through the room. Any of them can also become a room (a recorded impulse response from a real cathedral, say) or go to the Lab. <b>The microphone</b> can be sent live through the room. Wear headphones, or it will feed back.</p>
<p><b>Radio</b> streams play through the room when the station allows its sound to be processed, which browsers call CORS. When it doesn't, the box plays the station dry. You can add any https stream address. The list starts with a few of SomaFM's listener-supported channels.</p>
<p><b>Embeds</b> from YouTube, SoundCloud, Spotify, Vimeo, and Bandcamp play in those sites' own players. Browsers keep their sound sealed off from the page, so the room can't touch it.</p>

<h4>5. Sonar</h4>
<p><b>Echo ranging.</b> The box chirps, records, and correlates the recording with the chirp: this is a <i>matched filter</i>, which turns each returning chirp into a sharp peak. The strongest early peak is the direct sound from the speaker to the microphone, and it sets time zero. Every later peak is an echo from a distance r = c·t/2. The speed of sound depends on the air temperature, c = 331.3 √(1 + T/273.15) m/s, so set the temperature. The A-scope shows the latest ping, with echo strength against distance. The waterfall below stacks the pings over time, so walls draw vertical stripes and anything moving draws a slant. A laptop's microphone and speakers sit close together and are not very directional, so expect walls, tables, and your own head rather than a fine picture. The near-ultrasonic setting (17.5–20.5 kHz) is quieter to people but needs hardware that reaches it.</p>
<p><b>Doppler.</b> The box plays a steady tone, f₀ = 18 kHz by default, and watches the spectrum around it. A hand moving toward the box at speed v reflects the tone shifted by Δf = 2 v f₀ / c: about 10 Hz for every 10 cm/s at 18 kHz. The scrolling picture shows the band around the tone, and the reading turns the shift into speed. With <i>theremin</i> ticked, your hand's motion bends the pitch of a voice, so you can play it.</p>
<p><b>Two devices</b> measure the distance between them without synchronized clocks. The method is BeepBeep (Peng and colleagues, 2007). A chirps upward; B hears it and chirps downward half a second later. Each device records both chirps and times them on its own clock: Δ<sub>A</sub> is the time from the up-chirp to the down-chirp as A heard them, and Δ<sub>B</sub> the same as B heard them. Each clock's unknown offset cancels in its own Δ, and</p>
<p class="mono">d = (c/2)(Δ<sub>A</sub> − Δ<sub>B</sub>) + (s<sub>A</sub> + s<sub>B</sub>)/2,</p>
<p>where s is each device's own speaker-to-microphone distance. Read B's Δ off its screen and type it into A. Ranges to three or more known points would locate a device by trilateration; that is for a later version. The correlation peaks are interpolated between samples, so a good quiet room gives centimeters.</p>
<p><b>Care.</b> Keep levels low. Sustained high tones can bother dogs, cats, and some people, small speakers distort near their limits, and everyone deserves to know when a room is being pinged.</p>

<h4>The house's own sound</h4>
<p>The music box's output goes into the house's music bus, so the <i>music</i> level in the house's sound settings governs it. While the composer plays, the house's own background music steps aside. The clock's chimes and the weather are unaffected.</p>

<h4>Sources and further reading</h4>
<ul>
<li>Farina, A. "Simultaneous measurement of impulse response and distortion with a swept-sine technique," AES Convention, 2000.</li>
<li>Allen, J. B. and Berkley, D. A. "Image method for efficiently simulating small-room acoustics," <i>JASA</i> 65 (1979).</li>
<li>Schroeder, M. R. "New method of measuring reverberation time," <i>JASA</i> 37 (1965); and "Synthesis of low-peak-factor signals and binary sequences with low autocorrelation," <i>IEEE Trans. Inf. Theory</i> 16 (1970).</li>
<li>Golay, M. J. E. "Complementary series," <i>IRE Trans. Inf. Theory</i> (1961).</li>
<li>Costas, J. P. "A study of a class of detection waveforms having nearly ideal range–Doppler ambiguity properties," <i>Proc. IEEE</i> 72 (1984).</li>
<li>Karplus, K. and Strong, A. "Digital synthesis of plucked-string and drum timbres," <i>Computer Music Journal</i> 7 (1983).</li>
<li>Peng, C., Shen, G., Zhang, Y., Li, Y., and Tan, K. "BeepBeep: a high accuracy acoustic ranging system using COTS mobile devices," SenSys 2007.</li>
</ul>
</div>`;
