import config from '../config';

const fieldsResponse = await axios.get(`${config.urls.inscriptions.tables}/${tableName}/fields`);
setFields(fieldsResponse.data);
const recordResponse = await axios.get(`${config.urls.inscriptions.tables}/${tableName}/records/${id}`);
setRecord(recordResponse.data); 