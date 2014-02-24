/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.webservice;

import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.entities.overviews.ACentre;
import org.mousephenotype.dcc.visualise.entities.ActivityData;

/**
 * Web service for retrieving centres.
 * 
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("centres")
public class CentreFacadeREST extends AbstractFacade<ACentre> {

    private EntityManager em;

    public CentreFacadeREST() {
        super(ACentre.class);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public CentrePack all() {
        CentrePack p = new CentrePack();
        p.setDataSet(super.findAll());
        return p;
    }

    @GET
    @Path("activity")
    @Produces(MediaType.APPLICATION_JSON)
    public CentreActivityPack activity() {
        CentreActivityPack p = new CentreActivityPack();
        em = getEntityManager();
        TypedQuery<ActivityData> q = em.createQuery("SELECT new org.mousephenotype.dcc.visualise.entities.ActivityData(x.centreId.id, FUNC('YEAR', x.lastUpdate), FUNC('MONTH', x.lastUpdate), FUNC('WEEKDAY', x.lastUpdate), COUNT(x.id)) FROM XmlFile x GROUP BY x.centreId, FUNC('YEAR', x.lastUpdate), FUNC('MONTH', x.lastUpdate), FUNC('WEEK', x.lastUpdate)", ActivityData.class);
        p.setDataSet(q.getResultList());
        return p;
    }
}
