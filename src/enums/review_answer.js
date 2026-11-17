/**
 * A vendor's verdict on a submitted document.
 *
 * Sumsub sends these as `reviewResult.reviewAnswer` alongside a `reviewStatus`.
 * Only a completed review carries a meaningful answer; anything else is the
 * applicant still moving through the flow.
 *
 * The file previously declared this class without exporting it, so it could not
 * be imported at all - which is why the GREEN check was written as a bare
 * string literal, and why RED had nothing to compare against.
 */
class ReviewAnswer {
    static GREEN = 'GREEN';
    static RED = 'RED';
}

export default ReviewAnswer;
