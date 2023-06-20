const sanitizeID = (id: string) => id.toLowerCase().replaceAll(' ', '-');

export default sanitizeID;
