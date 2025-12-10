import { Router } from 'express';
import { WebhookDataModel } from '../models/webhook-data.model';
import { WebhookTestsModel } from '../models/webhook-test.model';

const router = Router();

router.post('/webhook', async (req, res) => {
    try {
        if (!!req?.body?.pix?.length) {
            try {
                let doc = new WebhookDataModel({ payload_type: 'PIX', pix: req.body.pix });
                await doc.save();
            } catch (error) { }
        }
    } catch (error) { }
    res.status(200).send('Webhook received');
});
router.post('/webhook/sicoob/pix', async (req, res) => {
    try {
        try {
            let doc = new WebhookTestsModel({ body: req.body });
            await doc.save();
        } catch (error) {}
        try {
            let doc = new WebhookDataModel({ payload_type: 'PIX', pix: req.body.pix });
            await doc.save();
        } catch (error) { }
    } catch (error) { }
    res.status(200).send('Webhook received');
});
// router.post('/webhook-forms', async (req, res) => {
//     try {
//         let doc = new WebhookTestsModel({ body: req.body });
//         await doc.save();
//     } catch (error) { }
//     res.status(200).send('Webhook received');
// })


export default router;