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

import java.util.Date;
import org.mousephenotype.dcc.visualise.entities.MpDetails;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.entities.impress.ParamMpterm;
import org.mousephenotype.dcc.visualise.entities.AnnotationData;

/**
 * Web service for retrieving annotations for a given genotype and parameter.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("annotations")
public class AnnotationsFacadeREST extends AbstractFacade<AnnotationData> {

    public AnnotationsFacadeREST() {
        super(AnnotationData.class);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public AnnotationsPack extjsFindBy(
            @QueryParam("gid") Integer genotypeId,
            @QueryParam("qeid") String parameterKey) {
        AnnotationsPack p = new AnnotationsPack();
        if (genotypeId == null
                || parameterKey == null
                || parameterKey.isEmpty()) {
            p.setDataSet(null, 0L);
        } else {
            EntityManager em = getEntityManager();
            TypedQuery<AnnotationData> q = em.createNamedQuery(
                    "Annotation.findByGidParameterKey", AnnotationData.class);
            q.setParameter("genotypeId", genotypeId);
            q.setParameter("parameterKey", parameterKey);
            List<AnnotationData> temp = q.getResultList();
            TypedQuery<ParamMpterm> m = em.createNamedQuery(
                    "ParamMpterm.findByMpId", ParamMpterm.class);
            m.setMaxResults(1);
            ParamMpterm t;
            for (AnnotationData a : temp) {
                try {
                    m.setParameter("mpId", a.getyMP());
                    t = m.getSingleResult();
                    a.setMp1(new MpDetails(a.getyMP(), t.getMpTerm(),
                            t.getSelectionOutcome()));

                    m.setParameter("mpId", a.getyMP1());
                    t = m.getSingleResult();
                    a.setMp2(new MpDetails(a.getyMP1(), t.getMpTerm(),
                            t.getSelectionOutcome()));
                } catch (Exception e) {
                }
            }
            p.setDataSet(temp);
            
            TypedQuery<Date> tq = em.createQuery("SELECT s.started FROM AnnotationSession s ORDER BY s.sessionId DESC", Date.class);
            tq.setMaxResults(1);
            p.setLastUpdate(tq.getSingleResult());
            em.close();
        }
        return p;
    }
}
