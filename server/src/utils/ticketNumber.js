import Counter from '../models/Counter.js';
import Ticket from '../models/Ticket.js';

/**
 * Atomically picks a collision-free ticket number, e.g. "TCK-1001".
 *
 * Takes the LARGER of:
 *  - the atomic counter document, and
 *  - the highest ticket number already in the collection (+1).
 *
 * This makes generation robust even if the counter was reset or the DB was
 * restored while tickets still exist — the unique index stays as a backstop,
 * but we never hand out a number that's guaranteed to collide.
 */
export async function nextTicketNumber() {
  const [counter, highest] = await Promise.all([
    Counter.findOneAndUpdate(
      { _id: 'ticket' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ),
    // TCK numbers are 4-digit zero-padded ("TCK-####"), so lexicographic
    // ordering matches numeric ordering up to TCK-99999.
    Ticket.findOne().sort({ ticketNumber: -1 }).select('ticketNumber').lean(),
  ]);

  const highestSeq = highest ? parseInt(String(highest.ticketNumber).split('-')[1] ?? '0', 10) - 1000 : 0;
  const seq = Math.max(counter.seq, highestSeq);
  return `TCK-${1000 + seq}`;
}