
import LoggerSingleton from '../utils/loggerUtils';
import { EventAuth0 } from '../types/user';
import { CustomError } from '../utils/customError';

const logger = LoggerSingleton.getInstance()
export const handler = async (event:EventAuth0)=>{
    logger.info(`🎫 Event Received: ${JSON.stringify(event)}`)
    try {
        logger.info(`✅ Received event for signup: ${JSON.stringify(event.detail.data.user_name)}`)
    } catch (error:any) {
        logger.error(`❌ Error when run handler: ${error.message}`);
        throw new CustomError(error.message, error.statusCode || 500)
    }
}   